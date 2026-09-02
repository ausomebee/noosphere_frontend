import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

/**
 * The single-issue detail view: it refetches the issue on mount, renders it as
 * five printable sections, and exposes nine mutations through one Actions menu.
 *
 * Every mutation follows the same shape -- call the API, refetch, toast, close
 * the modal -- and every one deliberately re-throws so the modal can keep the
 * user's input, so each probe swallows that rejection the way the real modals
 * do. Which entries the menu offers is permission-driven, and `usePermission`
 * is left real for that reason; only the Redux read underneath it is mocked.
 *
 * TableUtils is mocked because the PDF export would otherwise write a file, and
 * the document viewer hook because it needs a provider this view never mounts.
 */

const mocks = vi.hoisted(() => ({
  state: {},
  api: {
    GetIssueById: vi.fn(),
    CreateCommentOnIssue: vi.fn(),
    EditIssue: vi.fn(),
    AddAttachment: vi.fn(),
    ChangeCategory: vi.fn(),
    ChangePriority: vi.fn(),
    ReassignToStaff: vi.fn(),
    ChangeIssueStatus: vi.fn(),
    ContactTenantByMail: vi.fn(),
    MarkAsResolved: vi.fn(),
  },
  showToast: vi.fn(),
  showApiError: vi.fn(),
  openDocument: vi.fn(),
  exportTableData: vi.fn(),
  exportTableToPDF: vi.fn(),
  printTableData: vi.fn(),
}));

vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (selector) => selector(mocks.state),
}));

vi.mock('../api/IssueApi', () => ({ default: mocks.api }));
vi.mock('../Helper/ShowToast', () => ({
  showToast: (...a) => mocks.showToast(...a),
  showApiError: (...a) => mocks.showApiError(...a),
}));
vi.mock('../utils/TableUtils', () => ({
  exportTableData: (...a) => mocks.exportTableData(...a),
  exportTableToPDF: (...a) => mocks.exportTableToPDF(...a),
  printTableData: (...a) => mocks.printTableData(...a),
}));
vi.mock('../hooks/useDocumentViewer', () => ({
  default: () => ({ openDocument: mocks.openDocument }),
}));

// Each modal saves a fixed payload and swallows the re-thrown rejection, which
// is exactly what the real IssueViewModals do with it.
// A function declaration, not a const: the vi.mock factories below are hoisted
// above it and would otherwise reference it before initialization.
function modalProbe(testid, payload) {
  return (props) =>
    props.isOpen ? (
    <div data-testid={testid}>
      <button
        data-testid={`${testid}-save`}
        onClick={() => Promise.resolve(props.onSave(payload)).catch(() => {})}
      >
        save
      </button>
      <button data-testid={`${testid}-close`} onClick={props.onClose}>
        close
      </button>
      {/* The two modals that can carry a file also let the user send nothing,
          which is the arm the handler's `if (attachmentFile)` skips. */}
      {payload?.attachmentFile && (
        <button
          data-testid={`${testid}-save-no-file`}
          onClick={() => {
            const bare = { ...payload };
            delete bare.attachmentFile;
            return Promise.resolve(props.onSave(bare)).catch(() => {});
          }}
        >
          save without a file
        </button>
      )}
        <span data-testid={`${testid}-initial`}>
          {props.initialTitle ??
            props.initialCategory ??
            props.initialPriority ??
            props.initialStatus ??
            props.initialAssignee ??
            ''}
        </span>
      </div>
    ) : null;
}

vi.mock('../Components/ReusableModal/IssueViewModals/AddCommentModal', () => ({
  default: modalProbe('comment-modal', 'Looks fine to me'),
}));
vi.mock('../Components/ReusableModal/IssueViewModals/EditIssueModal', () => ({
  default: modalProbe('edit-modal', { title: 'New title', description: 'New description' }),
}));
vi.mock('../Components/ReusableModal/IssueViewModals/AddAttachmentModal', () => ({
  default: modalProbe('attachment-modal', new File(['x'], 'shot.png', { type: 'image/png' })),
}));
vi.mock('../Components/ReusableModal/IssueViewModals/ChangeCategoryModal', () => ({
  default: modalProbe('category-modal', 'Billing'),
}));
vi.mock('../Components/ReusableModal/IssueViewModals/ChangePriorityModal', () => ({
  default: modalProbe('priority-modal', 'P2'),
}));
vi.mock('../Components/ReusableModal/IssueViewModals/ReassignModal', () => ({
  default: modalProbe('reassign-modal', 'adm-2'),
}));
vi.mock('../Components/ReusableModal/IssueViewModals/ChangeStatusModal', () => ({
  default: modalProbe('status-modal', 'In Progress'),
}));
vi.mock('../Components/ReusableModal/IssueViewModals/ContactTenantModal', () => ({
  default: modalProbe('contact-modal', {
    header: 'About your issue',
    body: 'We are on it',
    attachmentFile: new File(['x'], 'note.txt', { type: 'text/plain' }),
  }),
}));
vi.mock('../Components/ReusableModal/IssueViewModals/MarkAsResolvedModal', () => ({
  default: modalProbe('resolved-modal', {
    resolution: 'Password reset',
    attachmentFile: new File(['x'], 'proof.png', { type: 'image/png' }),
  }),
}));

import ViewIssue from '../Pages/IssueManagement/ViewIssue';

const issue = { id: 'iss-1', issue_id: 'ISS-001' };

const detail = () => ({
  data: {
    id: 'iss-1',
    tenantId: 'ten-1',
    tenant: { companyName: 'Acme Health' },
    title: 'Login broken',
    category: 'Auth',
    priority: 'Enterprise Critical',
    status: 'In Progress',
    description: 'Cannot sign in',
    loggedBy: { firstName: 'Grace', lastName: 'Hopper' },
    assignedTo: { firstName: 'Ada', lastName: 'Lovelace' },
    createdAt: '2026-01-02T09:00:00Z',
    updatedAt: '2026-01-03T09:00:00Z',
    resolutionDeadline: '2026-02-01T09:00:00Z',
    attachments: [
      { key: 'screenshot.png', location: 'https://files.test/a.png' },
      { key: 'log.txt', location: 'https://files.test/b.txt' },
    ],
    Logs: [
      {
        logId: 'l1',
        action: 'STATUS_CHANGED',
        details: 'Moved to In Progress',
        createdAt: '2026-01-03T09:00:00Z',
        admin: { firstName: 'Ada', lastName: 'Lovelace' },
      },
    ],
    comments: [
      {
        id: 'cm1',
        comment: 'Investigating',
        createdAt: '2026-01-03T10:00:00Z',
        commentBy: { firstName: 'Grace', lastName: 'Hopper' },
      },
    ],
  },
});

const allPerms = [
  'add_issue_comment',
  'add_issue_attachment',
  'change_issue_priority',
  'change_issue_status',
  'edit_issue',
  'reassign_issue',
];

const buildState = (permissions) => ({
  authentication: {
    isAuthenticated: true,
    loading: false,
    error: null,
    accessToken: 'token',
    refreshToken: 'refresh',
    user: {
      id: 'adm-1',
      role: { roleModuleAccesses: [{ module: 'ISSUES', permissions }] },
    },
  },
});

const renderIssue = async ({ permissions = allPerms, ...props } = {}) => {
  mocks.state = buildState(permissions);
  const view = render(<ViewIssue issue={issue} onBack={props.onBack || vi.fn()} {...props} />);
  await act(async () => {});
  return view;
};

const openAction = async (label) => {
  fireEvent.click(screen.getByText('Actions'));
  await act(async () => {
    fireEvent.click(screen.getByRole('menuitem', { name: label }));
  });
};

// Reads the "Value" cell of the Issue Information row with this label.
const infoValue = (field) => {
  const row = Array.from(
    document.body.querySelectorAll('.issue-details .details-table tbody tr')
  ).find((tr) => tr.querySelector('td')?.textContent === field);
  return row?.querySelectorAll('td')[1]?.textContent;
};

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.api.GetIssueById.mockResolvedValue(detail());
  for (const name of [
    'CreateCommentOnIssue',
    'EditIssue',
    'AddAttachment',
    'ChangeCategory',
    'ChangePriority',
    'ReassignToStaff',
    'ChangeIssueStatus',
    'ContactTenantByMail',
    'MarkAsResolved',
  ]) {
    mocks.api[name].mockResolvedValue({});
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loading the issue', () => {
  it('shows skeletons until the issue arrives', () => {
    mocks.api.GetIssueById.mockReturnValue(new Promise(() => {}));
    mocks.state = buildState(allPerms);
    render(<ViewIssue issue={issue} onBack={vi.fn()} />);
    expect(document.body.querySelector('.skeleton-table')).toBeInTheDocument();
    expect(screen.queryByText('Actions')).toBeNull();
  });

  it('reports a failed load and stays on the skeletons', async () => {
    mocks.api.GetIssueById.mockRejectedValue(new Error('x'));
    await renderIssue();
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'LOAD_ISSUE');
    expect(screen.queryByText('Actions')).toBeNull();
  });

  it('goes back when the back button is pressed', async () => {
    const onBack = vi.fn();
    await renderIssue({ onBack });
    fireEvent.click(screen.getByText('Back'));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('the issue information table', () => {
  it('shows the mapped issue fields', async () => {
    await renderIssue();
    expect(infoValue('Tenant')).toBe('Acme Health');
    expect(infoValue('Issue ID')).toBe('ISS-001');
    expect(infoValue('Category')).toBe('Auth');
    expect(infoValue('Status')).toBe('In Progress');
    expect(infoValue('Logged by')).toBe('Grace Hopper');
    expect(infoValue('Assigned to')).toBe('Ada Lovelace');
  });

  it('slugifies the priority into a class name', async () => {
    await renderIssue();
    expect(document.body.querySelector('.priority-label')).toHaveClass('enterprise-critical');
  });

  it('substitutes placeholders for the fields the response omits', async () => {
    mocks.api.GetIssueById.mockResolvedValue({ data: {} });
    await renderIssue();
    expect(infoValue('Tenant')).toBe('Unknown');
    expect(infoValue('Title')).toBe('N/A');
    expect(infoValue('Category')).toBe('N/A');
    expect(infoValue('Status')).toBe('Not Started');
    expect(infoValue('Logged by')).toBe('Unknown');
    expect(infoValue('Assigned to')).toBe('Unassigned');
  });

  // Current behaviour, and a defect: `attachments` is normalised to `[]`
  // upstream, so the cell renders `[].map(...)` -- an empty array, which is
  // truthy -- and the "None" fallback beside it can never run. The CSV export
  // of the same field joins first and does say "None".
  it('leaves the attachments cell blank rather than saying None', async () => {
    mocks.api.GetIssueById.mockResolvedValue({ data: {} });
    await renderIssue();
    expect(infoValue('Attachments')).toBe('');
  });

  it('falls back to the issue id when the row carries no display id', async () => {
    mocks.state = buildState(allPerms);
    render(<ViewIssue issue={{ id: 'iss-1' }} onBack={vi.fn()} />);
    await act(async () => {});
    expect(infoValue('Issue ID')).toBe('#iss-1');
  });

  it('credits the tenant when no admin logged the issue', async () => {
    const payload = detail();
    payload.data.loggedBy = null;
    mocks.api.GetIssueById.mockResolvedValue(payload);
    await renderIssue();
    expect(infoValue('Logged by')).toBe('Acme Health');
  });

  it('calls an assignee with no name unassigned', async () => {
    const payload = detail();
    payload.data.assignedTo = {};
    mocks.api.GetIssueById.mockResolvedValue(payload);
    await renderIssue();
    expect(infoValue('Assigned to')).toBe('Unassigned');
  });

  it('names an attachment that arrives without a key', async () => {
    const payload = detail();
    payload.data.attachments = [{}];
    mocks.api.GetIssueById.mockResolvedValue(payload);
    await renderIssue();
    expect(infoValue('Attachments')).toBe('Attachment');
  });

  it('opens an attachment through the document viewer', async () => {
    await renderIssue();
    fireEvent.click(screen.getAllByText('screenshot.png')[0]);
    expect(mocks.openDocument).toHaveBeenCalledWith('https://files.test/a.png', 'screenshot.png');
  });
});

describe('the activity, document and comment sections', () => {
  it('lists the activity log', async () => {
    await renderIssue();
    expect(screen.getByText('STATUS_CHANGED')).toBeInTheDocument();
    expect(screen.getByText('Moved to In Progress')).toBeInTheDocument();
  });

  it('substitutes placeholders for an incomplete log entry', async () => {
    const payload = detail();
    payload.data.Logs = [{ createdAt: '2026-01-03T09:00:00Z' }];
    mocks.api.GetIssueById.mockResolvedValue(payload);
    await renderIssue();
    expect(screen.getByText('No details')).toBeInTheDocument();
    expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0);
  });

  it('says so when there is no activity', async () => {
    mocks.api.GetIssueById.mockResolvedValue({ data: {} });
    await renderIssue();
    expect(screen.getByText('No activity history available')).toBeInTheDocument();
  });

  it('lists the documents and opens one', async () => {
    await renderIssue();
    const link = document.body.querySelector('.document-link');
    fireEvent.click(link);
    expect(mocks.openDocument).toHaveBeenCalledWith('https://files.test/a.png', 'screenshot.png');
  });

  it('says so when there are no documents', async () => {
    mocks.api.GetIssueById.mockResolvedValue({ data: {} });
    await renderIssue();
    expect(screen.getByText('No documents available')).toBeInTheDocument();
  });

  it('lists the comments', async () => {
    await renderIssue();
    expect(screen.getByText('Investigating')).toBeInTheDocument();
    expect(screen.getByText('(Grace Hopper)')).toBeInTheDocument();
  });

  it('substitutes placeholders for an incomplete comment', async () => {
    const payload = detail();
    payload.data.comments = [{ createdAt: '2026-01-03T10:00:00Z' }];
    mocks.api.GetIssueById.mockResolvedValue(payload);
    await renderIssue();
    expect(screen.getByText('No text')).toBeInTheDocument();
  });

  it('says so when there are no comments', async () => {
    mocks.api.GetIssueById.mockResolvedValue({ data: {} });
    await renderIssue();
    expect(screen.getByText('No comments available')).toBeInTheDocument();
  });
});

describe('exporting a section', () => {
  const exportBar = (index) =>
    document.body.querySelectorAll('.header-actions')[index];

  it('exports the issue information as CSV', async () => {
    await renderIssue();
    const bar = exportBar(0);
    fireEvent.click(bar.querySelectorAll('button')[0]);
    fireEvent.click(screen.getByText('Export as CSV'));
    expect(mocks.exportTableData).toHaveBeenCalledWith(
      expect.arrayContaining([{ field: 'Tenant', value: 'Acme Health' }]),
      expect.any(Array),
      'issue-info.csv',
      'Issue Information'
    );
  });

  it('exports the issue information as PDF', async () => {
    await renderIssue();
    const bar = exportBar(0);
    fireEvent.click(bar.querySelectorAll('button')[0]);
    fireEvent.click(screen.getByText('Export as PDF'));
    expect(mocks.exportTableToPDF).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      'issue-info.pdf',
      'Issue Information'
    );
  });

  it('prints the description section', async () => {
    await renderIssue();
    const bar = exportBar(1);
    fireEvent.click(bar.querySelectorAll('button')[1]);
    expect(mocks.printTableData).toHaveBeenCalledWith(
      [{ field: 'Description', value: 'Cannot sign in' }],
      expect.any(Array),
      'Description'
    );
  });

  it('exports the comments section', async () => {
    await renderIssue();
    const bar = exportBar(4);
    fireEvent.click(bar.querySelectorAll('button')[0]);
    fireEvent.click(screen.getByText('Export as CSV'));
    expect(mocks.exportTableData).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ text: 'Investigating' })]),
      expect.any(Array),
      'comments.csv',
      'Comments'
    );
  });
});

describe('the actions menu', () => {
  it('offers every action to a fully privileged admin', async () => {
    await renderIssue();
    fireEvent.click(screen.getByText('Actions'));
    expect(screen.getAllByRole('menuitem')).toHaveLength(9);
  });

  it('offers only the ungated actions to an admin with no issue permissions', async () => {
    await renderIssue({ permissions: [] });
    fireEvent.click(screen.getByText('Actions'));
    expect(screen.getAllByRole('menuitem').map((b) => b.textContent)).toEqual([
      'Change category',
      'Contact tenant by email',
    ]);
  });

  it('offers both status actions to an admin who may change status', async () => {
    await renderIssue({ permissions: ['change_issue_status'] });
    fireEvent.click(screen.getByText('Actions'));
    expect(screen.getByRole('menuitem', { name: 'Change Status' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Mark as resolved' })).toBeInTheDocument();
  });

  it('closes again when the button is pressed twice', async () => {
    await renderIssue();
    fireEvent.click(screen.getByText('Actions'));
    fireEvent.click(screen.getByText('Actions'));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes on a click elsewhere on the page', async () => {
    await renderIssue();
    fireEvent.click(screen.getByText('Actions'));
    fireEvent.mouseDown(document.body.querySelector('.tenant-header'));
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

describe('issue mutations', () => {
  const run = async (action, testid) => {
    await openAction(action);
    await act(async () => {
      fireEvent.click(screen.getByTestId(`${testid}-save`));
    });
  };

  it('adds a comment', async () => {
    await renderIssue();
    await run('Add a comment', 'comment-modal');
    expect(mocks.api.CreateCommentOnIssue).toHaveBeenCalledWith(
      expect.objectContaining({ issueId: 'iss-1', comment: 'Looks fine to me', adminId: 'adm-1' })
    );
    expect(mocks.showToast).toHaveBeenCalledWith('Comment added successfully', 'success');
    expect(screen.queryByTestId('comment-modal')).toBeNull();
  });

  it('keeps the comment modal open when the save fails', async () => {
    mocks.api.CreateCommentOnIssue.mockRejectedValue(new Error('x'));
    await renderIssue();
    await run('Add a comment', 'comment-modal');
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'ADD_COMMENT');
    expect(screen.getByTestId('comment-modal')).toBeInTheDocument();
  });

  it('edits the title and description', async () => {
    await renderIssue();
    await openAction('Edit issue');
    expect(screen.getByTestId('edit-modal-initial')).toHaveTextContent('Login broken');
    await act(async () => {
      fireEvent.click(screen.getByTestId('edit-modal-save'));
    });
    expect(mocks.api.EditIssue).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New title', description: 'New description' })
    );
    expect(mocks.showToast).toHaveBeenCalledWith('Issue updated successfully', 'success');
  });

  it('keeps the edit modal open when the save fails', async () => {
    mocks.api.EditIssue.mockRejectedValue(new Error('x'));
    await renderIssue();
    await run('Edit issue', 'edit-modal');
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'EDIT_ISSUE');
    expect(screen.getByTestId('edit-modal')).toBeInTheDocument();
  });

  it('uploads an attachment as form data', async () => {
    await renderIssue();
    await run('Add an attachment', 'attachment-modal');
    const payload = mocks.api.AddAttachment.mock.calls[0][0].payload;
    expect(payload.get('id')).toBe('iss-1');
    expect(payload.get('attachment')).toBeInstanceOf(File);
    expect(payload.get('updatedBy')).toBe('adm-1');
    expect(mocks.showToast).toHaveBeenCalledWith('Attachment added successfully', 'success');
  });

  it('keeps the attachment modal open when the upload fails', async () => {
    mocks.api.AddAttachment.mockRejectedValue(new Error('x'));
    await renderIssue();
    await run('Add an attachment', 'attachment-modal');
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'ADD_ATTACHMENT');
    expect(screen.getByTestId('attachment-modal')).toBeInTheDocument();
  });

  it('changes the category', async () => {
    await renderIssue();
    await openAction('Change category');
    expect(screen.getByTestId('category-modal-initial')).toHaveTextContent('Auth');
    await act(async () => {
      fireEvent.click(screen.getByTestId('category-modal-save'));
    });
    expect(mocks.api.ChangeCategory).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'Billing', updatedBy: 'adm-1' })
    );
    expect(mocks.showToast).toHaveBeenCalledWith('Category changed successfully', 'success');
  });

  it('keeps the category modal open when the change fails', async () => {
    mocks.api.ChangeCategory.mockRejectedValue(new Error('x'));
    await renderIssue();
    await run('Change category', 'category-modal');
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'CHANGE_CATEGORY');
    expect(screen.getByTestId('category-modal')).toBeInTheDocument();
  });

  it('changes the priority', async () => {
    await renderIssue();
    await run('Change Priority', 'priority-modal');
    expect(mocks.api.ChangePriority).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 'P2' })
    );
    expect(mocks.showToast).toHaveBeenCalledWith('Priority changed successfully', 'success');
  });

  it('keeps the priority modal open when the change fails', async () => {
    mocks.api.ChangePriority.mockRejectedValue(new Error('x'));
    await renderIssue();
    await run('Change Priority', 'priority-modal');
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'CHANGE_PRIORITY');
    expect(screen.getByTestId('priority-modal')).toBeInTheDocument();
  });

  it('reassigns the issue', async () => {
    await renderIssue();
    await openAction('Reassign');
    expect(screen.getByTestId('reassign-modal-initial')).toHaveTextContent('Ada Lovelace');
    await act(async () => {
      fireEvent.click(screen.getByTestId('reassign-modal-save'));
    });
    expect(mocks.api.ReassignToStaff).toHaveBeenCalledWith(
      expect.objectContaining({ adminId: 'adm-2', updatedBy: 'adm-1' })
    );
    expect(mocks.showToast).toHaveBeenCalledWith('Issue reassigned successfully', 'success');
  });

  it('keeps the reassign modal open when the change fails', async () => {
    mocks.api.ReassignToStaff.mockRejectedValue(new Error('x'));
    await renderIssue();
    await run('Reassign', 'reassign-modal');
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'REASSIGN_ISSUE');
    expect(screen.getByTestId('reassign-modal')).toBeInTheDocument();
  });

  it('changes the status', async () => {
    await renderIssue();
    await run('Change Status', 'status-modal');
    expect(mocks.api.ChangeIssueStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'In Progress' })
    );
    expect(mocks.showToast).toHaveBeenCalledWith('Status changed successfully', 'success');
  });

  it('keeps the status modal open when the change fails', async () => {
    mocks.api.ChangeIssueStatus.mockRejectedValue(new Error('x'));
    await renderIssue();
    await run('Change Status', 'status-modal');
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'CHANGE_STATUS');
    expect(screen.getByTestId('status-modal')).toBeInTheDocument();
  });

  it('emails the tenant against the tenant id, not the issue id', async () => {
    await renderIssue();
    await run('Contact tenant by email', 'contact-modal');
    const payload = mocks.api.ContactTenantByMail.mock.calls[0][0].payload;
    expect(payload.get('id')).toBe('ten-1');
    expect(payload.get('header')).toBe('About your issue');
    expect(payload.get('attachment')).toBeInstanceOf(File);
    expect(mocks.showToast).toHaveBeenCalledWith('Email sent successfully', 'success');
  });

  it('keeps the contact modal open when the email fails', async () => {
    mocks.api.ContactTenantByMail.mockRejectedValue(new Error('x'));
    await renderIssue();
    await run('Contact tenant by email', 'contact-modal');
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'SEND_EMAIL');
    expect(screen.getByTestId('contact-modal')).toBeInTheDocument();
  });

  it('marks the issue resolved', async () => {
    await renderIssue();
    await run('Mark as resolved', 'resolved-modal');
    const payload = mocks.api.MarkAsResolved.mock.calls[0][0].payload;
    expect(payload.get('id')).toBe('iss-1');
    expect(payload.get('status')).toBe('Resolved');
    expect(payload.get('resolutionDescription')).toBe('Password reset');
    expect(mocks.showToast).toHaveBeenCalledWith('Issue marked as resolved', 'success');
  });

  it('keeps the resolve modal open when the save fails', async () => {
    mocks.api.MarkAsResolved.mockRejectedValue(new Error('x'));
    await renderIssue();
    await run('Mark as resolved', 'resolved-modal');
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'RESOLVE_ISSUE');
    expect(screen.getByTestId('resolved-modal')).toBeInTheDocument();
  });

  it('refetches the issue after a successful mutation', async () => {
    await renderIssue();
    mocks.api.GetIssueById.mockClear();
    await run('Change category', 'category-modal');
    expect(mocks.api.GetIssueById).toHaveBeenCalledTimes(1);
  });

  it('closes a modal without saving', async () => {
    await renderIssue();
    await openAction('Add a comment');
    fireEvent.click(screen.getByTestId('comment-modal-close'));
    expect(screen.queryByTestId('comment-modal')).toBeNull();
    expect(mocks.api.CreateCommentOnIssue).not.toHaveBeenCalled();
  });

  it('reloads the view when the issue prop changes', async () => {
    const { rerender } = await renderIssue();
    mocks.api.GetIssueById.mockClear();
    await act(async () => {
      rerender(<ViewIssue issue={{ id: 'iss-2', issue_id: 'ISS-002' }} onBack={vi.fn()} />);
    });
    await waitFor(() =>
      expect(mocks.api.GetIssueById).toHaveBeenCalledWith(expect.objectContaining({ id: 'iss-2' }))
    );
  });
});

describe('sending a mutation with no file attached', () => {
  const runBare = async (action, testid) => {
    fireEvent.click(screen.getByText('Actions'));
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: action }));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId(`${testid}-save-no-file`));
    });
  };

  it('emails the tenant without an attachment part', async () => {
    await renderIssue();
    await runBare('Contact tenant by email', 'contact-modal');

    const payload = mocks.api.ContactTenantByMail.mock.calls[0][0].payload;
    expect(payload.get('body')).toBe('We are on it');
    expect(payload.get('attachment')).toBeNull();
  });

  it('resolves the issue without an attachment part', async () => {
    await renderIssue();
    await runBare('Mark as resolved', 'resolved-modal');

    const payload = mocks.api.MarkAsResolved.mock.calls[0][0].payload;
    expect(payload.get('resolutionDescription')).toBe('Password reset');
    expect(payload.get('attachment')).toBeNull();
  });
});

describe('authorship the response cannot name', () => {
  const activityUser = () =>
    document.body.querySelectorAll('.activity-history tbody tr td')[2]
      ?.textContent;

  it('calls a log author with empty name parts Unknown', async () => {
    const payload = detail();
    // The admin record exists, so the `log.admin ? ... : "Unknown"` guard takes
    // its true arm and the fallback inside the template is what has to fire.
    payload.data.Logs[0].admin = { firstName: '', lastName: '' };
    mocks.api.GetIssueById.mockResolvedValue(payload);
    await renderIssue();

    expect(activityUser()).toBe('Unknown');
  });

  it('calls a comment author with empty name parts Unknown', async () => {
    const payload = detail();
    payload.data.comments[0].commentBy = { firstName: null, lastName: null };
    mocks.api.GetIssueById.mockResolvedValue(payload);
    await renderIssue();

    const comments = document.body.querySelector('.issues-comments-list');
    expect(comments.textContent).toContain('Unknown');
    expect(comments.textContent).toContain('Investigating');
  });
});

describe('mounting without an issue', () => {
  it('fetches nothing and stays on the skeletons', async () => {
    mocks.state = buildState(allPerms);
    render(<ViewIssue issue={null} onBack={vi.fn()} />);
    await act(async () => {});

    expect(mocks.api.GetIssueById).not.toHaveBeenCalled();
    expect(document.body.querySelector('.skeleton-table')).toBeInTheDocument();
  });
});

describe('the click-outside listener', () => {
  it('leaves a closed Actions menu alone', async () => {
    await renderIssue();
    // With the menu shut the dropdown ref is null, so the listener's guard
    // short-circuits before it ever reads the button ref.
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menuitem')).toBeNull();

    fireEvent.click(screen.getByText('Actions'));
    expect(screen.getAllByRole('menuitem').length).toBeGreaterThan(0);
  });

  it('keeps the menu open for a click inside it', async () => {
    await renderIssue();
    fireEvent.click(screen.getByText('Actions'));
    const menu = screen.getAllByRole('menuitem')[0];

    fireEvent.mouseDown(menu);
    expect(screen.getAllByRole('menuitem').length).toBeGreaterThan(0);
  });
});
