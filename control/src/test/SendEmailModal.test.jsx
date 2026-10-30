import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

const spies = vi.hoisted(() => ({
  showToast: vi.fn(),
  sendProspectEmail: vi.fn(),
}));

vi.mock('../Helper/ShowToast', () => ({ showToast: spies.showToast }));
vi.mock('../api/TenantApis', () => ({
  default: { SendProspectEmail: (...a) => spies.sendProspectEmail(...a) },
}));

const authState = {
  authentication: { accessToken: 'at', refreshToken: 'rt', user: { id: 'admin-1' } },
};
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (fn) => fn(authState),
}));

import SendEmailModal from '../Components/ReusableModal/SendEmailModal';

/**
 * The compose-an-email-to-a-prospect form.
 *
 * Validation is hand-rolled rather than schema-driven: it collects subject,
 * message and recipient problems into one object and refuses to send while any
 * remain. The recipient is the interesting one -- a prospect row can carry the
 * literal string "N/A" where an address should be, which counts as no
 * recipient at all and can only be fixed on the prospect, not here.
 *
 * The form empties itself every time the modal is reopened, so a half-composed
 * message never leaks into the next prospect.
 */

const onClose = vi.fn();

const renderModal = (props = {}) =>
  render(
    <SendEmailModal
      isOpen
      onClose={onClose}
      recipientEmail="ada@acme.test"
      recipientName="Ada Bell"
      {...props}
    />
  );

const primary = () => document.body.querySelector('.primary-button');
const secondary = () => document.body.querySelector('.secondary-button');
const subject = () => screen.getByPlaceholderText('Email subject');
const message = () => screen.getByPlaceholderText('Write your message...');

const send = async () => {
  await act(async () => {
    fireEvent.click(primary());
  });
};

const compose = () => {
  fireEvent.change(subject(), { target: { value: 'Following up' } });
  fireEvent.change(message(), { target: { value: 'Are you still interested?' } });
};

beforeEach(() => {
  vi.clearAllMocks();
  spies.sendProspectEmail.mockResolvedValue({ status: 'ok' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the recipient line', () => {
  it('renders nothing while closed', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('Send an email')).not.toBeInTheDocument();
  });

  it('names the prospect alongside the address', () => {
    renderModal();
    expect(screen.getByText(/Ada Bell/)).toBeInTheDocument();
    expect(screen.getByText(/<ada@acme.test>/)).toBeInTheDocument();
  });

  it('shows the bare address when the prospect has no name', () => {
    renderModal({ recipientName: undefined });
    expect(screen.getByText('<ada@acme.test>')).toBeInTheDocument();
  });

  it('says so when the prospect has no address at all', () => {
    renderModal({ recipientEmail: undefined });
    expect(screen.getByText(/No email on file/)).toBeInTheDocument();
  });

  it('treats a stored "N/A" as no address', () => {
    renderModal({ recipientEmail: 'N/A' });
    expect(screen.getByText(/No email on file/)).toBeInTheDocument();
  });
});

describe('validating before it sends', () => {
  it('refuses an empty subject and message', async () => {
    renderModal();
    await send();
    expect(screen.getByText('Subject is required.')).toBeInTheDocument();
    expect(screen.getByText('Message is required.')).toBeInTheDocument();
    expect(spies.sendProspectEmail).not.toHaveBeenCalled();
  });

  it('treats whitespace as empty', async () => {
    renderModal();
    fireEvent.change(subject(), { target: { value: '   ' } });
    fireEvent.change(message(), { target: { value: '   ' } });
    await send();
    expect(screen.getByText('Subject is required.')).toBeInTheDocument();
    expect(spies.sendProspectEmail).not.toHaveBeenCalled();
  });

  it('refuses to send to a prospect with no address', async () => {
    renderModal({ recipientEmail: 'N/A' });
    compose();
    await send();
    expect(
      screen.getByText('No recipient email on file for this prospect.')
    ).toBeInTheDocument();
    expect(spies.sendProspectEmail).not.toHaveBeenCalled();
  });
});

describe('sending', () => {
  it('posts the composed email with the current credentials', async () => {
    renderModal();
    compose();
    await send();
    expect(spies.sendProspectEmail).toHaveBeenCalledWith({
      to: 'ada@acme.test',
      subject: 'Following up',
      body: 'Are you still interested?',
      accessToken: 'at',
      refreshToken: 'rt',
    });
  });

  it('reports success and closes', async () => {
    renderModal();
    compose();
    await send();
    expect(spies.showToast).toHaveBeenCalledWith('Email sent', 'success');
    expect(onClose).toHaveBeenCalled();
  });

  it('surfaces the failure message the API raised', async () => {
    spies.sendProspectEmail.mockRejectedValue(new Error('Mailbox full'));
    renderModal();
    compose();
    await send();
    expect(spies.showToast).toHaveBeenCalledWith('Mailbox full', 'error');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('falls back to its own wording for a message-less failure', async () => {
    spies.sendProspectEmail.mockRejectedValue({});
    renderModal();
    compose();
    await send();
    expect(spies.showToast).toHaveBeenCalledWith('Failed to send email', 'error');
  });

  it('locks the send button while the request is in flight', async () => {
    let release;
    spies.sendProspectEmail.mockImplementation(
      () => new Promise((resolve) => { release = resolve; })
    );
    renderModal();
    compose();
    await act(async () => {
      fireEvent.click(primary());
    });
    expect(primary()).toBeDisabled();
    await act(async () => {
      release({});
    });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('reopening', () => {
  it('empties whatever was left half-composed', () => {
    const { rerender } = renderModal();
    compose();

    rerender(<SendEmailModal isOpen={false} onClose={onClose} recipientEmail="ada@acme.test" />);
    rerender(<SendEmailModal isOpen onClose={onClose} recipientEmail="ada@acme.test" />);

    expect(subject()).toHaveValue('');
    expect(message()).toHaveValue('');
  });

  it('clears the errors from the previous attempt too', async () => {
    const { rerender } = renderModal();
    await send();
    expect(screen.getByText('Subject is required.')).toBeInTheDocument();

    rerender(<SendEmailModal isOpen={false} onClose={onClose} recipientEmail="ada@acme.test" />);
    rerender(<SendEmailModal isOpen onClose={onClose} recipientEmail="ada@acme.test" />);

    expect(screen.queryByText('Subject is required.')).not.toBeInTheDocument();
  });

  it('closes without sending when cancelled', () => {
    renderModal();
    compose();
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    expect(spies.sendProspectEmail).not.toHaveBeenCalled();
  });
});
