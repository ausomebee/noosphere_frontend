import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import {
  RequiredMark,
  TextInput,
  SelectInput,
  CheckboxInput,
  SwitchInput,
  TextareaInput,
  SearchInput,
  RadioInput,
  PasswordInput,
  MultiSelectInput,
} from '../Components/Input/Inputs';

/**
 * Branch coverage for Inputs.jsx.
 *
 * Inputs.test.jsx covers the happy paths. This file drives the *other* side of
 * every conditional: the position variants, the empty/absent-prop paths, the
 * password strength tiers, and the portal/direction branches of the
 * multi-select.
 */

describe('RequiredMark', () => {
  it('renders the indicator when required', () => {
    const { container } = render(<RequiredMark required />);
    expect(container.querySelector('.required-indicator')).toBeInTheDocument();
  });

  it('renders nothing when not required', () => {
    const { container } = render(<RequiredMark required={false} />);
    expect(container.querySelector('.required-indicator')).toBeNull();
  });

  it('renders nothing when required is omitted', () => {
    const { container } = render(<RequiredMark />);
    expect(container.querySelector('.required-indicator')).toBeNull();
  });
});

describe('TextInput branches', () => {
  it('omits the label element entirely when no label is given', () => {
    const { container } = render(<TextInput placeholder="bare" />);
    expect(container.querySelector('.input-label')).toBeNull();
  });

  it('marks aria-required only when required', () => {
    const { rerender } = render(<TextInput label="A" required />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-required', 'true');
    rerender(<TextInput label="A" />);
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-required');
  });

  it('applies the error class and message only when error is set', () => {
    const { container, rerender } = render(<TextInput label="A" error="bad" />);
    expect(container.querySelector('.input-error')).toBeInTheDocument();
    rerender(<TextInput label="A" />);
    expect(container.querySelector('.input-error-message')).toBeNull();
  });

  it('honours a custom type', () => {
    const { container } = render(<TextInput label="When" type="date" />);
    expect(container.querySelector('input')).toHaveAttribute('type', 'date');
  });
});

describe('SelectInput branches', () => {
  const opts = [
    { value: '', label: 'ignored placeholder' },
    { value: 'a', label: 'Alpha' },
  ];

  it('drops manually supplied empty-value options', () => {
    render(<SelectInput label="Kind" options={opts} />);
    expect(screen.queryByText('ignored placeholder')).not.toBeInTheDocument();
  });

  it('builds the placeholder from a string label', () => {
    render(<SelectInput label="Kind" options={opts} />);
    expect(screen.getByText('-- Select Kind --')).toBeInTheDocument();
  });

  it('falls back to a generic placeholder when the label is not a string', () => {
    render(<SelectInput label={<span>Node</span>} options={opts} />);
    expect(screen.getByText('-- Select --')).toBeInTheDocument();
  });

  it('falls back to a generic placeholder when there is no label', () => {
    render(<SelectInput options={opts} />);
    expect(screen.getByText('-- Select --')).toBeInTheDocument();
  });

  it('shows the empty hint when no real options remain', () => {
    render(<SelectInput label="Kind" options={[{ value: '', label: 'x' }]} emptyHint="Add a payer first" />);
    expect(screen.getByText('Add a payer first')).toBeInTheDocument();
  });

  it('ignores the empty hint when real options exist', () => {
    render(<SelectInput label="Kind" options={opts} emptyHint="Add a payer first" />);
    expect(screen.queryByText('Add a payer first')).not.toBeInTheDocument();
  });

  it('tolerates options being undefined', () => {
    render(<SelectInput label="Kind" />);
    expect(screen.getByText('-- Select Kind --')).toBeInTheDocument();
  });

  it('renders the error message', () => {
    render(<SelectInput label="Kind" options={opts} error="required" />);
    expect(screen.getByText('required')).toBeInTheDocument();
  });
});

describe('CheckboxInput branches', () => {
  it('renders the box before the label by default', () => {
    const { container } = render(<CheckboxInput label="Agree" />);
    const group = container.querySelector('.input-checkbox-group');
    expect(group).toHaveClass('input-position-before');
    expect(group.firstChild.tagName).toBe('INPUT');
  });

  it('renders the label before the box when positioned after', () => {
    const { container } = render(<CheckboxInput label="Agree" inputPosition="after" />);
    const group = container.querySelector('.input-checkbox-group');
    expect(group).toHaveClass('input-position-after');
    expect(group.firstChild.tagName).toBe('LABEL');
  });

  it('omits the label node when no label is given', () => {
    const { container } = render(<CheckboxInput inputPosition="after" />);
    expect(container.querySelector('.input-checkbox-label')).toBeNull();
  });

  it('marks aria-required when required', () => {
    render(<CheckboxInput label="Agree" required />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-required', 'true');
  });
});

describe('SwitchInput branches', () => {
  it('renders the label before the toggle by default (position after)', () => {
    const { container } = render(<SwitchInput label="On" />);
    const group = container.querySelector('.input-switch-group');
    expect(group).toHaveClass('input-position-after');
    expect(group.firstChild.className).toContain('input-switch-label');
  });

  it('renders the toggle first when positioned before', () => {
    const { container } = render(<SwitchInput label="On" inputPosition="before" />);
    const group = container.querySelector('.input-switch-group');
    expect(group).toHaveClass('input-position-before');
    expect(group.firstChild.className).toContain('switch');
  });

  it('omits the label node when no label is given', () => {
    const { container } = render(<SwitchInput inputPosition="before" />);
    expect(container.querySelector('.input-switch-label')).toBeNull();
  });

  it('marks aria-required when required', () => {
    render(<SwitchInput label="On" required />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-required', 'true');
  });
});

describe('TextareaInput branches', () => {
  it('renders label, error and aria-required together', () => {
    const { container } = render(
      <TextareaInput label="Notes" required error="too short" placeholder="type" />
    );
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('too short')).toBeInTheDocument();
    expect(container.querySelector('textarea')).toHaveAttribute('aria-required', 'true');
    expect(container.querySelector('.input-error')).toBeInTheDocument();
  });

  it('omits label, error and aria-required when not supplied', () => {
    const { container } = render(<TextareaInput placeholder="type" />);
    expect(container.querySelector('.input-label')).toBeNull();
    expect(container.querySelector('.input-error-message')).toBeNull();
    expect(container.querySelector('textarea')).not.toHaveAttribute('aria-required');
  });

  it('forwards onChange', () => {
    const onChange = vi.fn();
    render(<TextareaInput label="Notes" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hi' } });
    expect(onChange).toHaveBeenCalled();
  });
});

describe('SearchInput branches', () => {
  it('renders with a placeholder and forwards typing', () => {
    const onChange = vi.fn();
    render(<SearchInput placeholder="Search tenants" onChange={onChange} />);
    const box = screen.getByPlaceholderText('Search tenants');
    fireEvent.change(box, { target: { value: 'acme' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('renders with the default className when none is given', () => {
    const { container } = render(<SearchInput placeholder="Search" />);
    expect(container.querySelector('.input-search-wrapper')).toBeInTheDocument();
  });
});

describe('RadioInput branches', () => {
  it('renders the input before the label by default', () => {
    const { container } = render(<RadioInput name="n" value="a" label="Alpha" />);
    const group = container.querySelector('.input-radio-group');
    expect(group).toHaveClass('input-position-before');
    expect(group.firstChild.tagName).toBe('INPUT');
  });

  it('renders the label before the input when positioned after', () => {
    const { container } = render(
      <RadioInput name="n" value="a" label="Alpha" inputPosition="after" />
    );
    const group = container.querySelector('.input-radio-group');
    expect(group).toHaveClass('input-position-after');
    expect(group.firstChild.tagName).toBe('LABEL');
  });

  it('omits the label in the before variant when none is given', () => {
    const { container } = render(<RadioInput name="n" value="a" />);
    expect(container.querySelector('.input-radio-label')).toBeNull();
  });

  it('omits the label in the after variant when none is given', () => {
    const { container } = render(<RadioInput name="n" value="a" inputPosition="after" />);
    expect(container.querySelector('.input-radio-label')).toBeNull();
  });
});

describe('PasswordInput visibility toggle', () => {
  it('starts masked and exposes a Show label', () => {
    const { container } = render(<PasswordInput label="Password" />);
    expect(container.querySelector('input')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Show password')).toBeInTheDocument();
  });

  it('unmasks and swaps the label and icon when toggled', () => {
    const { container } = render(<PasswordInput label="Password" />);
    fireEvent.click(screen.getByLabelText('Show password'));
    expect(container.querySelector('input')).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Hide password')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Hide password'));
    expect(container.querySelector('input')).toHaveAttribute('type', 'password');
  });

  it('renders label, error and aria-required when supplied', () => {
    const { container } = render(
      <PasswordInput label="Password" required error="too weak" />
    );
    expect(screen.getByText('too weak')).toBeInTheDocument();
    expect(container.querySelector('input')).toHaveAttribute('aria-required', 'true');
  });

  it('omits label and error when not supplied', () => {
    const { container } = render(<PasswordInput />);
    expect(container.querySelector('.input-label')).toBeNull();
    expect(container.querySelector('.input-error-message')).toBeNull();
  });
});

describe('PasswordInput strength checklist', () => {
  const strengthOf = (container) =>
    container.querySelector('.password-strength span')?.textContent;

  it('renders nothing until something is typed', () => {
    const { container } = render(<PasswordInput label="P" showStrength />);
    expect(container.querySelector('.password-strength')).toBeNull();
  });

  it('is not rendered at all when showStrength is false', () => {
    const { container } = render(<PasswordInput label="P" value="Abcdef1!" onChange={() => {}} />);
    expect(container.querySelector('.password-strength')).toBeNull();
  });

  it('reads Weak when two or fewer rules pass', () => {
    const { container } = render(
      <PasswordInput label="P" showStrength value="abc" onChange={() => {}} />
    );
    expect(strengthOf(container)).toBe('Weak password');
  });

  it('reads Medium when some but not all rules pass', () => {
    const { container } = render(
      <PasswordInput label="P" showStrength value="Abcdefgh" onChange={() => {}} />
    );
    expect(strengthOf(container)).toBe('Medium password');
  });

  it('reads Strong only when every rule passes', () => {
    const { container } = render(
      <PasswordInput label="P" showStrength value="Abcdefg1!" onChange={() => {}} />
    );
    expect(strengthOf(container)).toBe('Strong password');
  });

  it('states the default 8-character minimum', () => {
    render(<PasswordInput label="P" showStrength value="abc" onChange={() => {}} />);
    expect(screen.getByText(/At least 8 characters/)).toBeInTheDocument();
  });

  it('states a raised minimum when one is passed', () => {
    render(
      <PasswordInput label="P" showStrength minLength={12} value="abc" onChange={() => {}} />
    );
    expect(screen.getByText(/At least 12 characters/)).toBeInTheDocument();
  });

  it('does not call an 11-character password Strong at a 12 minimum', () => {
    const { container } = render(
      <PasswordInput label="P" showStrength minLength={12} value="Abcdefg1!aa" onChange={() => {}} />
    );
    expect(strengthOf(container)).not.toBe('Strong password');
  });

  it('tracks an uncontrolled input through typing', () => {
    const { container } = render(<PasswordInput label="P" showStrength />);
    fireEvent.input(container.querySelector('input'), { target: { value: 'Abcdefg1!' } });
    expect(strengthOf(container)).toBe('Strong password');
  });
});

describe('PasswordInput match indicator', () => {
  it('is absent when matchValue is not supplied', () => {
    const { container } = render(<PasswordInput label="P" value="abc" onChange={() => {}} />);
    expect(container.querySelector('.password-match')).toBeNull();
  });

  it('is absent while the field is empty', () => {
    const { container } = render(<PasswordInput label="P" matchValue="abc" />);
    expect(container.querySelector('.password-match')).toBeNull();
  });

  it('confirms a match immediately, without waiting for blur', () => {
    render(<PasswordInput label="P" value="abc" matchValue="abc" onChange={() => {}} />);
    expect(screen.getByText('✓ Passwords match')).toBeInTheDocument();
  });

  it('stays quiet about a mismatch until the field is left', () => {
    const { container } = render(
      <PasswordInput label="P" value="abc" matchValue="xyz" onChange={() => {}} />
    );
    expect(container.querySelector('.password-match')).toBeNull();
  });

  it('reports the mismatch once the field is blurred', () => {
    const { container } = render(
      <PasswordInput label="P" value="abc" matchValue="xyz" onChange={() => {}} />
    );
    fireEvent.blur(container.querySelector('input'));
    expect(screen.getByText('✕ Passwords do not match')).toBeInTheDocument();
  });

  it('calls a supplied onBlur as well as tracking blur internally', () => {
    const onBlur = vi.fn();
    const { container } = render(
      <PasswordInput label="P" value="abc" matchValue="xyz" onBlur={onBlur} onChange={() => {}} />
    );
    fireEvent.blur(container.querySelector('input'));
    expect(onBlur).toHaveBeenCalled();
    expect(screen.getByText('✕ Passwords do not match')).toBeInTheDocument();
  });

  it('does not throw when no onBlur is supplied', () => {
    const { container } = render(<PasswordInput label="P" matchValue="x" />);
    expect(() => fireEvent.blur(container.querySelector('input'))).not.toThrow();
  });
});

describe('MultiSelectInput branches', () => {
  const options = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the placeholder when nothing is selected', () => {
    render(<MultiSelectInput label="Codes" options={options} value={[]} onChange={() => {}} />);
    expect(screen.getByText('Select...')).toBeInTheDocument();
  });

  it('shows a custom placeholder', () => {
    render(
      <MultiSelectInput options={options} value={[]} onChange={() => {}} placeholder="Pick codes" />
    );
    expect(screen.getByText('Pick codes')).toBeInTheDocument();
  });

  it('shows tags instead of the placeholder once something is selected', () => {
    render(<MultiSelectInput options={options} value={['a']} onChange={() => {}} />);
    expect(screen.queryByText('Select...')).not.toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });

  it('adds a value that is not yet selected', () => {
    const onChange = vi.fn();
    render(<MultiSelectInput options={options} value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    fireEvent.click(screen.getByText('Beta'));
    expect(onChange).toHaveBeenCalledWith(['b']);
  });

  it('removes a value that is already selected', () => {
    const onChange = vi.fn();
    const { container } = render(
      <MultiSelectInput options={options} value={['a', 'b']} onChange={onChange} />
    );
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    // "Alpha" appears twice once selected -- as a tag and as a dropdown option.
    // Scope to the dropdown so this drives the deselect branch, not the tag.
    const dropdown = container.querySelector('.multi-select-dropdown');
    fireEvent.click(within(dropdown).getByText('Alpha'));
    expect(onChange).toHaveBeenCalledWith(['b']);
  });

  it('removes a value from its tag without opening the dropdown', () => {
    const onChange = vi.fn();
    const { container } = render(
      <MultiSelectInput options={options} value={['a', 'b']} onChange={onChange} />
    );
    fireEvent.click(within(container).getAllByLabelText('Remove')[0]);
    expect(onChange).toHaveBeenCalledWith(['b']);
    expect(container.querySelector('.multi-select-dropdown')).toBeNull();
  });

  it('reports when there are no options to choose from', () => {
    render(<MultiSelectInput options={[]} value={[]} onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByText('No options available')).toBeInTheDocument();
  });

  it('defaults options to an empty list when the prop is omitted', () => {
    render(<MultiSelectInput value={[]} onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByText('No options available')).toBeInTheDocument();
  });

  it('defaults value to an empty list when the prop is omitted', () => {
    render(<MultiSelectInput options={options} onChange={() => {}} />);
    expect(screen.getByText('Select...')).toBeInTheDocument();
  });

  it('closes when the click lands outside the container', () => {
    const { container } = render(
      <MultiSelectInput options={options} value={[]} onChange={() => {}} />
    );
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    expect(container.querySelector('.multi-select-dropdown')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(container.querySelector('.multi-select-dropdown')).toBeNull();
  });

  it('stays open when the mousedown lands inside the container', () => {
    const { container } = render(
      <MultiSelectInput options={options} value={[]} onChange={() => {}} />
    );
    const trigger = screen.getByRole('button', { expanded: false });
    fireEvent.click(trigger);
    fireEvent.mouseDown(trigger);
    expect(container.querySelector('.multi-select-dropdown')).toBeInTheDocument();
  });

  it('renders the error message and marks the trigger', () => {
    const { container } = render(
      <MultiSelectInput options={options} value={[]} onChange={() => {}} error="pick one" />
    );
    expect(screen.getByText('pick one')).toBeInTheDocument();
    expect(container.querySelector('.multi-select-trigger')).toHaveClass('input-error');
  });

  it('portals the dropdown downward when asked', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 10, right: 210, top: 100, bottom: 130, width: 200, height: 30, x: 10, y: 100, toJSON() {},
    });
    render(
      <MultiSelectInput options={options} value={[]} onChange={() => {}} usePortal />
    );
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    const dd = document.body.querySelector('.multi-select-dropdown');
    expect(dd).toBeInTheDocument();
    expect(dd.style.position).toBe('fixed');
    expect(dd.style.top).toBe('134px');
  });

  it('portals the dropdown upward when the direction is up', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 10, right: 210, top: 100, bottom: 130, width: 200, height: 30, x: 10, y: 100, toJSON() {},
    });
    render(
      <MultiSelectInput
        options={options}
        value={[]}
        onChange={() => {}}
        usePortal
        dropDirection="up"
      />
    );
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    const dd = document.body.querySelector('.multi-select-dropdown');
    expect(dd.style.position).toBe('fixed');
    expect(dd.style.bottom).toBe(`${window.innerHeight - 100 + 4}px`);
    expect(dd.style.top).toBe('auto');
  });

  it('renders inline rather than portalled by default', () => {
    const { container } = render(
      <MultiSelectInput options={options} value={[]} onChange={() => {}} />
    );
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    expect(container.querySelector('.multi-select-dropdown')).toBeInTheDocument();
  });

  it('omits the label element when no label is given', () => {
    const { container } = render(
      <MultiSelectInput options={options} value={[]} onChange={() => {}} />
    );
    expect(container.querySelector('.input-label')).toBeNull();
  });

  it('marks the label required when asked', () => {
    const { container } = render(
      <MultiSelectInput label="Codes" required options={options} value={[]} onChange={() => {}} />
    );
    expect(container.querySelector('.required-indicator')).toBeInTheDocument();
  });
});
