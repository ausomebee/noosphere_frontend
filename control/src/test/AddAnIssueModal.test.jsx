import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const showApiError = vi.fn();
vi.mock('../Helper/ShowToast', () => ({
  showToast: vi.fn(),
  showApiError: (...a) => showApiError(...a),
}));

const showValidationErrors = vi.fn();
vi.mock('../Helper/formErrors', () => ({
  showValidationErrors: (...a) => showValidationErrors(...a),
}));

const clearDraft = vi.fn();
vi.mock('../hooks/useReduxFormDraft', () => ({ default: () => clearDraft }));

const state = {
  authentication: { accessToken: 'at', refreshToken: 'rt', user: { id: 'admin-1' } },
};
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (fn) => fn(state),
}));

import AddIssueModal from '../Components/ReusableModal/AddAnIssueModal';

/**
 * The log-an-issue form.
 *
 * The interesting piece is the SLA: the deadline is `now + N <duration>`
 * computed in the timezone the user picked, and only the resulting instant is
 * sent. Business days skip weekends, so the tests below pin the *shape* of what
 * is sent and the weekend skipping rather than an exact wall-clock value, which
 * would depend on the day the suite happens to run.
 *
 * Priority options also depend on the tenant: an enterprise tenant is offered a
 * longer list, and choosing a tenant is what switches it.
 *
 * Note the save handler throws its own error for an unusable deadline and
 * catches it in the same try, so an incomplete SLA surfaces through the API
 * error reporter rather than through form validation.
 */

const onClose = vi.fn();
const onSave = vi.fn();

const tenantList = [
  { tenantId: 't1', name: 'Acme Health' },
  { tenantId: 't2', name: 'Beta Clinic', isEnterprise: true },
];
const staffList = [
  { staffId: 's1', name: 'Ada Bell' },
  { staffId: 's2', name: 'Retired Staff', active: false },
];

const renderModal = (props = {}) =>
  render(
    <AddIssueModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      tenantList={tenantList}
      staffList={staffList}
      {...props}
    />
  );

const selectFor = (label) =>
  screen.getByText(label).closest('.input-group').querySelector('select');
const inputFor = (label) =>
  screen.getByText(label).closest('.input-group').querySelector('input, textarea');
const slaValue = () => document.body.querySelector('.sla-select-one');
const slaDuration = () => document.body.querySelector('.sla-select');
const primary = () => document.body.querySelector('.primary-button');

const fillValid = ({ duration = 'hours', value = '4' } = {}) => {
  fireEvent.change(selectFor('Tenant'), { target: { value: 't1' } });
  fireEvent.change(inputFor('Issue Title'), { target: { value: 'Login broken' } });
  fireEvent.change(inputFor('Issue Description'), {
    target: { value: 'Nobody can sign in.' },
  });
  fireEvent.change(selectFor('Category'), { target: { value: 'Bug Report' } });
  fireEvent.change(selectFor('Priority'), { target: { value: 'P2' } });
  fireEvent.change(slaValue(), { target: { value } });
  fireEvent.change(slaDuration(), { target: { value: duration } });
};

const save = async () => {
  await act(async () => { fireEvent.click(primary()); });
};

beforeEach(() => {
  vi.clearAllMocks();
  onSave.mockImplementation(async (_data, done) => done?.());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('when it renders at all', () => {
  it('renders nothing while closed', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('Log an Issue')).not.toBeInTheDocument();
  });

  it('opens with every field blank', () => {
    renderModal();
    expect(screen.getByText('Log an Issue')).toBeInTheDocument();
    expect(inputFor('Issue Title').value).toBe('');
    expect(selectFor('Tenant').value).toBe('');
  });

  it('defaults the timezone to the browser it is running in', () => {
    renderModal();
    expect(selectFor('Timezone').value).toBeTruthy();
  });
});

describe('the pickers', () => {
  it('offers each tenant it was given', () => {
    renderModal();
    expect(screen.getByText('Acme Health')).toBeInTheDocument();
    expect(screen.getByText('Beta Clinic')).toBeInTheDocument();
  });

  it('hints when there are no tenants at all', () => {
    // SelectInput drops any option whose value is empty and shows `emptyHint`
    // as the placeholder instead, so the "No tenant available" entry the modal
    // builds never actually renders.
    renderModal({ tenantList: [] });
    expect(screen.queryByText('No tenant available')).not.toBeInTheDocument();
    // With no emptyHint on this picker, it falls back to its label-derived
    // placeholder and gives no clue that there is nothing to choose.
    expect(screen.getByText('-- Select Tenant --')).toBeInTheDocument();
  });

  it('offers only staff who are still active', () => {
    renderModal();
    expect(screen.getByText('Ada Bell')).toBeInTheDocument();
    expect(screen.queryByText('Retired Staff')).not.toBeInTheDocument();
  });

  it('hints when there are no staff at all', () => {
    renderModal({ staffList: [] });
    expect(
      screen.getByText('No staff found. Create one in Settings → Staff.')
    ).toBeInTheDocument();
  });

  it('offers the enterprise priorities once an enterprise tenant is chosen', async () => {
    renderModal();
    const before = selectFor('Priority').querySelectorAll('option').length;
    fireEvent.change(selectFor('Tenant'), { target: { value: 't2' } });
    await waitFor(() =>
      expect(selectFor('Priority').querySelectorAll('option').length).toBeGreaterThan(before)
    );
  });

  it('keeps the base priorities for an ordinary tenant', async () => {
    renderModal();
    const before = selectFor('Priority').querySelectorAll('option').length;
    fireEvent.change(selectFor('Tenant'), { target: { value: 't1' } });
    await waitFor(() =>
      expect(selectFor('Priority').querySelectorAll('option').length).toBe(before)
    );
  });

  it('falls back to the base priorities for a tenant it cannot find', async () => {
    renderModal();
    fireEvent.change(selectFor('Tenant'), { target: { value: 't2' } });
    await waitFor(() =>
      expect(selectFor('Priority').querySelectorAll('option').length).toBeGreaterThan(1)
    );
    fireEvent.change(selectFor('Tenant'), { target: { value: '' } });
    await waitFor(() =>
      expect(selectFor('Priority').querySelectorAll('option').length).toBeGreaterThan(1)
    );
  });
});

describe('validation', () => {
  it('reports an entirely blank form rather than saving', async () => {
    renderModal();
    await save();
    await waitFor(() => expect(showValidationErrors).toHaveBeenCalled());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows the message for each required field', async () => {
    renderModal();
    await save();
    await waitFor(() =>
      expect(screen.getByText('Issue Title is required')).toBeInTheDocument()
    );
    expect(screen.getByText('Company Name is required')).toBeInTheDocument();
    expect(screen.getByText('Issue Description is required')).toBeInTheDocument();
    expect(screen.getByText('Category is required')).toBeInTheDocument();
    expect(screen.getByText('Priority is required')).toBeInTheDocument();
    expect(screen.getByText('Resolution Time is required')).toBeInTheDocument();
    expect(screen.getByText('Duration is required')).toBeInTheDocument();
  });
});

describe('the resolution deadline', () => {
  const savedDeadline = () => new Date(onSave.mock.calls[0][0].resolutionDeadline);

  it('sends an absolute instant for a deadline in hours', async () => {
    renderModal();
    fillValid({ duration: 'hours', value: '4' });
    await save();

    const deadline = savedDeadline();
    const hoursAway = (deadline - Date.now()) / (60 * 60 * 1000);
    expect(hoursAway).toBeGreaterThan(3.9);
    expect(hoursAway).toBeLessThan(4.1);
  });

  it('sends a deadline several days out', async () => {
    renderModal();
    fillValid({ duration: 'days', value: '3' });
    await save();

    const daysAway = (savedDeadline() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(daysAway).toBeGreaterThan(2.5);
    expect(daysAway).toBeLessThan(3.5);
  });

  it('skips weekends for a deadline in business days', async () => {
    renderModal();
    fillValid({ duration: 'business days', value: '5' });
    await save();

    const deadline = savedDeadline();
    // Five business days is at least five calendar days and never lands on a
    // weekend, whichever day the suite runs on.
    const daysAway = (deadline - Date.now()) / (24 * 60 * 60 * 1000);
    expect(daysAway).toBeGreaterThan(4.5);
    expect([0, 6]).not.toContain(deadline.getDay());
  });

  it('shows the deadline in the chosen timezone', async () => {
    renderModal();
    fillValid({ duration: 'hours', value: '4' });
    await waitFor(() =>
      expect(document.body.querySelector('.resolution-date')).toBeInTheDocument()
    );
    expect(document.body.querySelector('.resolution-date').textContent).toContain(
      'within 4 hours'
    );
  });

  it('shows no deadline until both halves of the SLA are chosen', () => {
    renderModal();
    fireEvent.change(slaValue(), { target: { value: '4' } });
    expect(document.body.querySelector('.resolution-date')).toBeNull();
  });

  it('recalculates when the timezone changes', async () => {
    renderModal();
    fillValid({ duration: 'days', value: '2' });
    await waitFor(() =>
      expect(document.body.querySelector('.resolution-date')).toBeInTheDocument()
    );
    const before = document.body.querySelector('.resolution-date').textContent;

    const zone = Array.from(selectFor('Timezone').options)
      .map((o) => o.value)
      .find((v) => v && v !== selectFor('Timezone').value);
    fireEvent.change(selectFor('Timezone'), { target: { value: zone } });
    await waitFor(() =>
      expect(document.body.querySelector('.resolution-date').textContent).not.toBe(before)
    );
  });
});

describe('saving', () => {
  it('sends the issue and closes on success', async () => {
    renderModal();
    fillValid();
    fireEvent.change(selectFor('Assign to Staff'), { target: { value: 's1' } });
    await save();

    const [issue] = onSave.mock.calls[0];
    expect(issue).toEqual(
      expect.objectContaining({
        title: 'Login broken',
        description: 'Nobody can sign in.',
        category: 'Bug Report',
        priority: 'P2',
        tenantId: 't1',
        adminId: 's1',
        assignToStaff: 's1',
        adminLoggedById: 'admin-1',
        createdBy: 'admin-1',
        image: null,
      })
    );
    expect(clearDraft).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('leaves the modal open when the caller never signals success', async () => {
    onSave.mockResolvedValue(undefined);
    renderModal();
    fillValid();
    await save();
    expect(onSave).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('reports a save the backend refused', async () => {
    onSave.mockRejectedValue(new Error('server said no'));
    renderModal();
    fillValid();
    await save();
    expect(showApiError).toHaveBeenCalledWith(expect.any(Error), 'CREATE_ISSUE');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes and forgets everything on cancel', () => {
    renderModal();
    fireEvent.change(inputFor('Issue Title'), { target: { value: 'Something' } });
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('attachments', () => {
  const attach = (files) =>
    fireEvent.change(document.body.querySelector('.upload-input'), { target: { files } });

  const image = (name, sizeMB = 0.5) => {
    const f = new File(['x'], name, { type: 'image/png' });
    Object.defineProperty(f, 'size', { value: sizeMB * 1024 * 1024 });
    return f;
  };

  it('lists a file it accepted, sized in kilobytes', () => {
    renderModal();
    attach([image('shot.png', 0.5)]);
    expect(screen.getByText(/shot\.png \(512 KB\)/)).toBeInTheDocument();
  });

  it('sizes a larger file in megabytes', () => {
    renderModal();
    attach([image('shot.png', 2)]);
    expect(screen.getByText(/shot\.png \(2\.0 MB\)/)).toBeInTheDocument();
  });

  it('refuses a file over the fifty-megabyte limit', () => {
    renderModal();
    attach([image('huge.png', 60)]);
    expect(screen.getByText('File size exceeds 50MB limit')).toBeInTheDocument();
  });

  it('sends the first file that uploaded cleanly', async () => {
    renderModal();
    attach([image('huge.png', 60), image('shot.png', 0.5)]);
    fillValid();
    await save();
    expect(onSave.mock.calls[0][0].image).toEqual(expect.any(File));
    expect(onSave.mock.calls[0][0].image.name).toBe('shot.png');
  });

  it('sends nothing when every attachment was refused', async () => {
    renderModal();
    attach([image('huge.png', 60)]);
    fillValid();
    await save();
    expect(onSave.mock.calls[0][0].image).toBeNull();
  });

  it('accumulates files across several choices', () => {
    renderModal();
    attach([image('one.png')]);
    attach([image('two.png')]);
    expect(document.body.querySelectorAll('.file-item')).toHaveLength(2);
  });
});

describe('the simulated upload progress', () => {
  const attach = (files) =>
    fireEvent.change(document.body.querySelector('.upload-input'), {
      target: { files },
    });

  const image = (name) => {
    const f = new File(['x'], name, { type: 'image/png' });
    Object.defineProperty(f, 'size', { value: 512 * 1024 });
    return f;
  };

  const bars = () =>
    Array.from(document.body.querySelectorAll('.progress')).map(
      (el) => el.style.width
    );

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // The row the ticker writes to is `index + files.length - newFiles.length`,
  // where `files` is the list as it stood *before* this batch. For the very
  // first batch that arithmetic is negative, so the bar it is driving does not
  // exist and every row stays at zero.
  it('leaves the first batch of bars at zero', () => {
    renderModal();
    attach([image('first.png')]);
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(bars()).toEqual(['0%']);
  });

  it('drives the previous row once a second batch arrives', () => {
    renderModal();
    attach([image('first.png')]);
    attach([image('second.png')]);
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(bars()).toEqual(['10%', '0%']);
  });

  // A filename containing "Unable" is the component's stand-in for a failed
  // upload. The failure is applied through the same off-by-one index, so it
  // lands on the earlier row rather than the file that "failed".
  it('marks a row failed when a later file is named as unable to upload', () => {
    renderModal();
    attach([image('first.png')]);
    attach([image('Unable to upload.png')]);
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(
      screen.getByText('Unable to upload. Please try again')
    ).toBeInTheDocument();
    const rows = document.body.querySelectorAll('.file-item');
    expect(rows[0].querySelector('.file-error')).not.toBeNull();
    expect(rows[1].querySelector('.file-error')).toBeNull();
  });

  it('stops ticking once a batch reaches a hundred percent', () => {
    renderModal();
    attach([image('first.png')]);
    attach([image('second.png')]);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(bars()).toEqual(['100%', '0%']);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(bars()).toEqual(['100%', '0%']);
  });
});

describe('the timezone list built at module load', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('offers UTC alone on a runtime that reports no zone data', async () => {
    // Both fallbacks are decided once, when the module is first evaluated, so
    // the only way in is to re-import it under an Intl that knows nothing: no
    // resolved zone for the viewer, and no supportedValuesOf to enumerate.
    vi.resetModules();
    const realDateTimeFormat = Intl.DateTimeFormat;
    const realSupportedValuesOf = Intl.supportedValuesOf;
    Intl.DateTimeFormat = function StubbedDateTimeFormat() {
      return { resolvedOptions: () => ({ timeZone: undefined }) };
    };
    delete Intl.supportedValuesOf;

    let Reimported;
    try {
      Reimported = (await import('../Components/ReusableModal/AddAnIssueModal'))
        .default;
    } finally {
      Intl.DateTimeFormat = realDateTimeFormat;
      Intl.supportedValuesOf = realSupportedValuesOf;
    }

    render(
      <Reimported
        isOpen
        onClose={onClose}
        onSave={onSave}
        tenantList={tenantList}
        staffList={staffList}
      />
    );

    // Beside the select's own blank placeholder, UTC is the whole list.
    const timezone = selectFor('Timezone');
    expect(
      Array.from(timezone.options)
        .map((o) => o.value)
        .filter(Boolean)
    ).toEqual(['UTC']);
    expect(timezone.value).toBe('UTC');
  });
});

describe('an SLA with the timezone cleared', () => {
  it('falls back to the browser zone for the displayed deadline', async () => {
    renderModal();
    fillValid({ duration: 'days', value: '2' });
    const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Move off the default first, so the fallback is visible as a change back
    // rather than as the value that was there all along.
    const other = Array.from(selectFor('Timezone').options)
      .map((o) => o.value)
      .find((v) => v && v !== browserZone);
    fireEvent.change(selectFor('Timezone'), { target: { value: other } });
    await waitFor(() =>
      expect(
        document.body.querySelector('.resolution-date').textContent
      ).toContain(other)
    );

    // The select carries a blank placeholder, so the field really can be
    // emptied even though the schema will refuse the form afterwards.
    fireEvent.change(selectFor('Timezone'), { target: { value: '' } });
    await waitFor(() =>
      expect(
        document.body.querySelector('.resolution-date').textContent
      ).toContain(browserZone)
    );
  });
});

