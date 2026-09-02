import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

/**
 * The edit-a-prospect form.
 *
 * Everything interesting happens either side of the form: on open it re-reads
 * the stored country/state through the geo normalisers, so a record holding
 * "US" or a free-text "Wakanda" still opens with something selected; on save it
 * flattens the flat form back into the nested `location` object the API wants
 * and dispatches a thunk whose `.unwrap()` result decides between a success
 * toast and a thrown failure.
 *
 * Draft persistence is deliberately switched off in this modal, so the hook is
 * stubbed to nothing but the `clearDraft` callback the success path calls.
 */

const spies = vi.hoisted(() => ({
  showToast: vi.fn(),
  showValidationErrors: vi.fn(),
  clearDraft: vi.fn(),
  unwrap: vi.fn(),
  updateCandidate: vi.fn((arg) => ({ type: 'pipeline/updateCandidate', payload: arg })),
  dispatch: vi.fn(),
}));

vi.mock('../Helper/ShowToast', () => ({ showToast: spies.showToast }));
vi.mock('../Helper/formErrors', () => ({
  showValidationErrors: (...a) => spies.showValidationErrors(...a),
}));
vi.mock('../hooks/useReduxFormDraft', () => ({ default: () => spies.clearDraft }));
vi.mock('../ReduxStore/features/PipelineSlice', () => ({
  updateCandidate: (...a) => spies.updateCandidate(...a),
}));

const authState = {
  authentication: {
    accessToken: 'at',
    refreshToken: 'rt',
    user: { id: 'admin-1' },
  },
};
vi.mock('react-redux', () => ({
  useDispatch: () => spies.dispatch,
  useSelector: (fn) => fn(authState),
}));

import EditProspectModal from '../Components/ReusableModal/EditProspectModal';

const onClose = vi.fn();
const onSave = vi.fn();

const staffList = [
  { staffId: 's1', name: 'Ada Bell' },
  { staffId: 's2', name: 'Retired Staff', active: false },
];
const stages = [{ stageId: 'st1', name: 'Discovery' }];

// A record that already passes validation, so a test that cares about the save
// path doesn't have to fill six fields first.
const validForm = (over = {}) => ({
  id: 'c1',
  company: 'Acme Health',
  contactPerson: 'Ada Bell',
  email: 'ada@acme.test',
  phone: '+1 555 0100',
  companySize: '1-5',
  organizationType: 'Other',
  location: '1 Main St',
  city: 'Springfield',
  state: '',
  zipCode: '12345',
  country: '',
  leadSource: 'Referral',
  subdomain: 'acme',
  assignToStaff: 's1',
  onboardStage: 'st1',
  ...over,
});

const renderModal = (props = {}) =>
  render(
    <EditProspectModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      formData={validForm()}
      staffList={staffList}
      stages={stages}
      {...props}
    />
  );

const primary = () => document.body.querySelector('.primary-button');

// `handleSubmit` always returns a promise, so ReusableModal holds the button
// until it settles rather than for its usual fixed 600ms.
const save = async () => {
  await act(async () => {
    fireEvent.click(primary());
  });
};

// Labels here carry no htmlFor, so reach the control through its input-group.
const field = (label) => {
  const group = [...document.body.querySelectorAll('.input-group')].find(
    (g) => g.querySelector('.input-label')?.textContent.replace('*', '') === label
  );
  return group?.querySelector('input, select, textarea');
};

beforeEach(() => {
  vi.clearAllMocks();
  spies.unwrap.mockResolvedValue({ status: 'ok' });
  spies.dispatch.mockImplementation(() => ({ unwrap: spies.unwrap }));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('opening the form', () => {
  it('renders nothing while closed', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('Edit information')).not.toBeInTheDocument();
  });

  it('shows the record it was handed', () => {
    renderModal();
    expect(screen.getByText('Edit information')).toBeInTheDocument();
    expect(field('Company Name')).toHaveValue('Acme Health');
    expect(field('Email')).toHaveValue('ada@acme.test');
  });

  it('resolves a stored country code to its display name', () => {
    renderModal({ formData: validForm({ country: 'US' }) });
    expect(field('Country')).toHaveValue('United States');
  });

  it('keeps a free-text country the library has never heard of', () => {
    // normalizeCountry returns "" for these, so the raw stored value is the
    // fallback -- and withCustomOption appends it so it stays selectable.
    renderModal({ formData: validForm({ country: 'Wakanda' }) });
    expect(field('Country')).toHaveValue('Wakanda');
  });

  it('leaves the country blank when the record has none', () => {
    renderModal({ formData: validForm({ country: undefined }) });
    expect(field('Country')).toHaveValue('');
  });

  it('resolves a stored state abbreviation within its country', () => {
    renderModal({ formData: validForm({ country: 'US', state: 'CA' }) });
    expect(field('State / Province')).toHaveValue('California');
  });

  it('keeps a free-text state as it was stored', () => {
    renderModal({ formData: validForm({ country: 'US', state: 'Lagos State' }) });
    expect(field('State / Province')).toHaveValue('Lagos State');
  });

  it('locks the state field until a country is chosen', () => {
    renderModal({ formData: validForm({ country: '' }) });
    expect(field('State / Province')).toBeDisabled();
    expect(screen.getByText('Select a country first.')).toBeInTheDocument();
  });

  it('explains a country it can offer no states for', () => {
    // Every real country in the dataset has regions, so the only way to reach
    // this arm is a free-text country: the field unlocks because something is
    // selected, but the library has nothing to offer against it.
    renderModal({ formData: validForm({ country: 'Wakanda' }) });
    expect(field('State / Province')).not.toBeDisabled();
    expect(
      screen.getByText('This country has no states/provinces.')
    ).toBeInTheDocument();
  });

  it('offers the staff and stages it was given', () => {
    renderModal();
    expect(screen.getByText('Ada Bell')).toBeInTheDocument();
    expect(screen.getByText('Discovery')).toBeInTheDocument();
  });

  it('drops staff who are no longer active', () => {
    renderModal();
    expect(screen.queryByText('Retired Staff')).not.toBeInTheDocument();
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
});

describe('editing fields', () => {
  it('clears the state when the country changes', () => {
    renderModal({ formData: validForm({ country: 'US', state: 'CA' }) });
    fireEvent.change(field('Country'), { target: { value: 'Canada' } });
    expect(field('State / Province')).toHaveValue('');
  });

  it('strips anything but lowercase letters and hyphens from the subdomain', () => {
    renderModal();
    fireEvent.change(field('Subdomain'), { target: { value: 'My Co. 42-Ltd' } });
    expect(field('Subdomain')).toHaveValue('myco-ltd');
  });

  it('copes with the subdomain being emptied outright', () => {
    renderModal();
    fireEvent.change(field('Subdomain'), { target: { value: '' } });
    expect(field('Subdomain')).toHaveValue('');
  });
});

describe('saving', () => {
  it('flattens the form into the nested payload the API wants', async () => {
    renderModal({ formData: validForm({ country: 'US', state: 'CA' }) });
    await save();

    expect(spies.updateCandidate).toHaveBeenCalledTimes(1);
    const sent = spies.updateCandidate.mock.calls[0][0];
    expect(sent).toMatchObject({
      id: 'c1',
      companyName: 'Acme Health',
      fullName: 'Ada Bell',
      email: 'ada@acme.test',
      phoneNumber: '+1 555 0100',
      createdBy: 'admin-1',
      stage: 'DEFAULT',
      accessToken: 'at',
      refreshToken: 'rt',
    });
    expect(sent.location).toEqual({
      address: '1 Main St',
      city: 'Springfield',
      stateProvince: 'California',
      zip: '12345',
      country: 'United States',
    });
  });

  it('reports success, clears the draft and closes', async () => {
    renderModal();
    await save();
    expect(spies.showToast).toHaveBeenCalledWith(
      'Candidate updated successfully!',
      'success'
    );
    expect(spies.clearDraft).toHaveBeenCalled();
    expect(onSave).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('treats any status but ok as a failure', async () => {
    spies.unwrap.mockResolvedValue({ status: 'error' });
    renderModal();
    await save();
    expect(spies.showToast).toHaveBeenCalledWith('Failed to update candidate.', 'error');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('prefers the server message when the thunk rejects', async () => {
    spies.unwrap.mockRejectedValue({
      response: { data: { message: 'Subdomain already taken' } },
    });
    renderModal();
    await save();
    expect(spies.showToast).toHaveBeenCalledWith('Subdomain already taken', 'error');
  });

  it('falls back to its own wording for a bare error', async () => {
    spies.unwrap.mockRejectedValue(new Error('boom'));
    renderModal();
    await save();
    expect(spies.showToast).toHaveBeenCalledWith('Failed to update candidate.', 'error');
  });

  it('stays quiet about failures outside development', async () => {
    vi.stubEnv('DEV', false);
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    spies.unwrap.mockRejectedValue(new Error('boom'));
    renderModal();
    await save();
    expect(logged).not.toHaveBeenCalled();
    expect(spies.showToast).toHaveBeenCalledWith('Failed to update candidate.', 'error');
  });

  it('refuses to submit a record missing required fields', async () => {
    renderModal({ formData: validForm({ company: '', email: '' }) });
    await save();
    expect(spies.showValidationErrors).toHaveBeenCalled();
    expect(spies.updateCandidate).not.toHaveBeenCalled();
  });

  it('rejects a malformed zip code', async () => {
    renderModal();
    fireEvent.change(field('ZIP / Postal Code'), { target: { value: 'ABCDE' } });
    await save();
    expect(spies.showValidationErrors).toHaveBeenCalled();
    expect(spies.updateCandidate).not.toHaveBeenCalled();
  });

  it('closes without saving when cancelled', () => {
    renderModal();
    fireEvent.click(document.body.querySelector('.secondary-button'));
    expect(onClose).toHaveBeenCalled();
    expect(spies.updateCandidate).not.toHaveBeenCalled();
  });
});
