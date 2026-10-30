import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

const spies = vi.hoisted(() => ({
  showToast: vi.fn(),
  showValidationErrors: vi.fn(),
  clearDraft: vi.fn(),
  createCandidate: vi.fn(),
}));

vi.mock('../Helper/ShowToast', () => ({ showToast: spies.showToast }));
vi.mock('../Helper/formErrors', () => ({
  showValidationErrors: (...a) => spies.showValidationErrors(...a),
}));
vi.mock('../hooks/useReduxFormDraft', () => ({ default: () => spies.clearDraft }));
vi.mock('../api/TenantApis', () => ({
  default: { CreateCandidate: (...a) => spies.createCandidate(...a) },
}));

const authState = {
  authentication: { accessToken: 'at', refreshToken: 'rt', user: { id: 'admin-1' } },
};
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (fn) => fn(authState),
}));

import AddProspectModal from '../Components/ReusableModal/AddProspectModal';

/**
 * The add-a-prospect form.
 *
 * Only four fields are actually required -- company, email, staff and stage --
 * but the ones that are optional still carry format rules, so a half-filled
 * form fails on a zip code or a subdomain rather than on emptiness.
 *
 * The stage the modal was opened from is pushed in on a deferred timeout so it
 * beats any restored draft, which means the preselection is not visible on the
 * first paint and every test that cares has to let the timeout run.
 *
 * The API's answer is checked twice over -- a status of "ok" AND an id -- so a
 * response missing either half is treated as a failed create.
 */

const onClose = vi.fn();
const onSave = vi.fn();

const staffList = [
  { staffId: 's1', name: 'Ada Bell' },
  { staffId: 's2', name: 'Retired Staff', active: false },
];
const stages = [
  { stageId: 'st1', name: 'Discovery' },
  { stageId: 'st2', name: 'Negotiation' },
];

const renderModal = (props = {}) =>
  render(
    <AddProspectModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      staffList={staffList}
      stages={stages}
      {...props}
    />
  );

const primary = () => document.body.querySelector('.primary-button');
const secondary = () => document.body.querySelector('.secondary-button');

const field = (label) => {
  const group = [...document.body.querySelectorAll('.input-group')].find(
    (g) => g.querySelector('.input-label')?.textContent.replace('*', '') === label
  );
  return group?.querySelector('input, select, textarea');
};

const save = async () => {
  await act(async () => {
    fireEvent.click(primary());
  });
};

// The four fields the schema insists on; anything else a test needs it sets
// for itself.
const fillRequired = () => {
  fireEvent.change(field('Company Name'), { target: { value: 'Acme Health' } });
  fireEvent.change(field('Email'), { target: { value: 'ada@acme.test' } });
  fireEvent.change(field('Assign to Staff'), { target: { value: 's1' } });
  fireEvent.change(field('Select Onboarding Stage'), { target: { value: 'st1' } });
};

// The payload's nested `location` is the same object react-hook-form goes on
// to blank out when it resets, so anything that inspects it after the fact sees
// empty strings. Snapshot it while the request is still in flight.
let sent;

beforeEach(() => {
  vi.clearAllMocks();
  sent = undefined;
  spies.createCandidate.mockImplementation(async (payload) => {
    sent = structuredClone(payload);
    return { data: { status: 'ok', data: { id: 'new-1' } } };
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('opening the form', () => {
  it('renders nothing at all while closed', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('Add a new candidate')).not.toBeInTheDocument();
  });

  it('opens empty', () => {
    renderModal();
    expect(screen.getByText('Add a new candidate')).toBeInTheDocument();
    expect(field('Company Name')).toHaveValue('');
    expect(field('Select Onboarding Stage')).toHaveValue('');
  });

  it('preselects the stage the board opened it from', async () => {
    renderModal({ pipelineStageId: 'st2' });
    // Deferred by a 0ms timeout so it lands after any draft restore.
    await waitFor(() => expect(field('Select Onboarding Stage')).toHaveValue('st2'));
  });

  it('offers the active staff and every stage', () => {
    renderModal();
    expect(screen.getByText('Ada Bell')).toBeInTheDocument();
    expect(screen.queryByText('Retired Staff')).not.toBeInTheDocument();
    expect(screen.getByText('Negotiation')).toBeInTheDocument();
  });

  it('hints at where to create staff and stages when there are none', () => {
    renderModal({ staffList: [], stages: [] });
    expect(field('Assign to Staff')).toBeDisabled();
    expect(field('Select Onboarding Stage')).toBeDisabled();
    expect(
      screen.getByText('No staff found. Create one in Settings → Staff.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'No onboarding stages found. Create one in Settings → Pipeline Stages.'
      )
    ).toBeInTheDocument();
  });

  it('locks the state field until a country is chosen', () => {
    renderModal();
    expect(field('State / Province')).toBeDisabled();
    expect(screen.getByText('Select a country first.')).toBeInTheDocument();
  });

  it('unlocks the states once a country is chosen', () => {
    renderModal();
    fireEvent.change(field('Country'), { target: { value: 'United States' } });
    expect(field('State / Province')).not.toBeDisabled();
    expect(screen.queryByText('Select a country first.')).not.toBeInTheDocument();
  });

  it('clears the state when the country changes under it', () => {
    renderModal();
    fireEvent.change(field('Country'), { target: { value: 'United States' } });
    fireEvent.change(field('State / Province'), { target: { value: 'California' } });
    fireEvent.change(field('Country'), { target: { value: 'Canada' } });
    expect(field('State / Province')).toHaveValue('');
  });
});

describe('typing into it', () => {
  it('strips anything but lowercase letters and hyphens from the subdomain', () => {
    renderModal();
    fireEvent.change(field('Subdomain'), { target: { value: 'My Co. 42-Ltd' } });
    expect(field('Subdomain')).toHaveValue('myco-ltd');
  });

  it('copes with the subdomain being emptied outright', () => {
    renderModal();
    fireEvent.change(field('Subdomain'), { target: { value: 'abc' } });
    fireEvent.change(field('Subdomain'), { target: { value: '' } });
    expect(field('Subdomain')).toHaveValue('');
  });
});

describe('validation', () => {
  it('refuses an empty form', async () => {
    renderModal();
    await save();
    expect(spies.showValidationErrors).toHaveBeenCalled();
    expect(spies.createCandidate).not.toHaveBeenCalled();
  });

  it('refuses a malformed email', async () => {
    renderModal();
    fillRequired();
    fireEvent.change(field('Email'), { target: { value: 'not-an-email' } });
    await save();
    expect(spies.showValidationErrors).toHaveBeenCalled();
    expect(spies.createCandidate).not.toHaveBeenCalled();
  });

  it('refuses a zip code with letters in it', async () => {
    renderModal();
    fillRequired();
    fireEvent.change(field('ZIP / Postal Code'), { target: { value: 'SW1A' } });
    await save();
    expect(spies.showValidationErrors).toHaveBeenCalled();
    expect(spies.createCandidate).not.toHaveBeenCalled();
  });

  it('refuses a phone number that is too short', async () => {
    renderModal();
    fillRequired();
    fireEvent.change(field('Phone'), { target: { value: '123' } });
    await save();
    expect(spies.showValidationErrors).toHaveBeenCalled();
    expect(spies.createCandidate).not.toHaveBeenCalled();
  });
});

describe('creating the prospect', () => {
  it('sends the whole form with the nested location', async () => {
    renderModal();
    fillRequired();
    fireEvent.change(field('Contact person'), { target: { value: 'Ada Bell' } });
    fireEvent.change(field('Address'), { target: { value: '1 Main St' } });
    fireEvent.change(field('Country'), { target: { value: 'Canada' } });
    await save();

    expect(spies.createCandidate).toHaveBeenCalledTimes(1);
    expect(sent).toMatchObject({
      fullName: 'Ada Bell',
      companyName: 'Acme Health',
      email: 'ada@acme.test',
      assignToAdmin: 's1',
      pipelineStageId: 'st1',
      createdBy: 'admin-1',
      stage: 'DEFAULT',
      accessToken: 'at',
      refreshToken: 'rt',
    });
    expect(sent.location).toMatchObject({ address: '1 Main St', country: 'Canada' });
  });

  it('falls back to the company name when nobody is named', async () => {
    renderModal();
    fillRequired();
    await save();
    expect(spies.createCandidate).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: 'Acme Health' })
    );
  });

  it('hands the board a prospect whose address the reset has already wiped', async () => {
    // Pinning current behaviour, not endorsing it: the form resets immediately
    // after `onSave`, and because the payload spread is shallow the board's
    // copy shares -- and loses -- the very `location` object being reset.
    renderModal();
    fillRequired();
    fireEvent.change(field('Address'), { target: { value: '1 Main St' } });
    await save();
    expect(sent.location.address).toBe('1 Main St');
    expect(onSave.mock.calls[0][0].location).toEqual({
      address: '',
      city: '',
      stateProvince: '',
      zip: '',
      country: '',
    });
  });

  it('hands the new id back to the board and closes', async () => {
    renderModal();
    fillRequired();
    await save();
    expect(spies.showToast).toHaveBeenCalledWith('Candidate created successfully', 'success');
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'new-1', companyName: 'Acme Health' })
    );
    expect(spies.clearDraft).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('treats an ok response with no id as a failure', async () => {
    spies.createCandidate.mockResolvedValue({
      data: { status: 'ok', message: 'Nothing was created' },
    });
    renderModal();
    fillRequired();
    await save();
    expect(spies.showToast).toHaveBeenCalledWith('Nothing was created', 'error');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('falls back to its own wording for a silent bad response', async () => {
    spies.createCandidate.mockResolvedValue({ data: { status: 'error' } });
    renderModal();
    fillRequired();
    await save();
    expect(spies.showToast).toHaveBeenCalledWith('Invalid response from server', 'error');
  });

  it('prefers the server message when the request fails', async () => {
    spies.createCandidate.mockRejectedValue({
      response: { data: { message: 'Email already registered' } },
      message: 'Request failed with status code 409',
    });
    renderModal();
    fillRequired();
    await save();
    expect(spies.showToast).toHaveBeenCalledWith('Email already registered', 'error');
  });

  it('uses the error message when the server sent no body', async () => {
    spies.createCandidate.mockRejectedValue(new Error('Network Error'));
    renderModal();
    fillRequired();
    await save();
    expect(spies.showToast).toHaveBeenCalledWith('Network Error', 'error');
  });

  it('falls back to its own wording for a bare rejection', async () => {
    spies.createCandidate.mockRejectedValue({});
    renderModal();
    fillRequired();
    await save();
    expect(spies.showToast).toHaveBeenCalledWith('Failed to create candidate', 'error');
  });

  it('locks the save button while the request is in flight', async () => {
    let release;
    spies.createCandidate.mockImplementation(
      () => new Promise((resolve) => { release = resolve; })
    );
    renderModal();
    fillRequired();
    await act(async () => {
      fireEvent.click(primary());
    });
    expect(primary()).toBeDisabled();
    await act(async () => {
      release({ data: { status: 'ok', data: { id: 'new-1' } } });
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('closes without creating anything when cancelled', () => {
    renderModal();
    fillRequired();
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    expect(spies.createCandidate).not.toHaveBeenCalled();
  });
});
