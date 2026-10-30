import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExportPrintActions from '../Components/ExportPrintActions/ExportPrintActions';

describe('ExportPrintActions', () => {
  it('renders export and print buttons', () => {
    render(<ExportPrintActions />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2); // export + print
  });

  it('shows dropdown when export button clicked', () => {
    render(<ExportPrintActions />);
    const exportBtn = screen.getAllByRole('button')[0];
    fireEvent.click(exportBtn);
    expect(screen.getByText('Export as CSV')).toBeInTheDocument();
    expect(screen.getByText('Export as PDF')).toBeInTheDocument();
  });

  it('hides dropdown when export button clicked again', () => {
    render(<ExportPrintActions />);
    const exportBtn = screen.getAllByRole('button')[0];
    fireEvent.click(exportBtn);
    expect(screen.getByText('Export as CSV')).toBeInTheDocument();
    fireEvent.click(exportBtn);
    expect(screen.queryByText('Export as CSV')).not.toBeInTheDocument();
  });

  it('calls onExportCSV and closes dropdown', () => {
    const onExportCSV = vi.fn();
    render(<ExportPrintActions onExportCSV={onExportCSV} />);
    fireEvent.click(screen.getAllByRole('button')[0]);
    fireEvent.click(screen.getByText('Export as CSV'));
    expect(onExportCSV).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Export as CSV')).not.toBeInTheDocument();
  });

  it('calls onExportPDF and closes dropdown', () => {
    const onExportPDF = vi.fn();
    render(<ExportPrintActions onExportPDF={onExportPDF} />);
    fireEvent.click(screen.getAllByRole('button')[0]);
    fireEvent.click(screen.getByText('Export as PDF'));
    expect(onExportPDF).toHaveBeenCalledTimes(1);
  });

  it('calls onPrint when print button clicked', () => {
    const onPrint = vi.fn();
    render(<ExportPrintActions onPrint={onPrint} />);
    const printBtn = screen.getAllByRole('button')[1];
    fireEvent.click(printBtn);
    expect(onPrint).toHaveBeenCalledTimes(1);
  });

  it('closes dropdown on outside click', () => {
    render(
      <div>
        <div data-testid="outside">outside</div>
        <ExportPrintActions />
      </div>
    );
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(screen.getByText('Export as CSV')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByText('Export as CSV')).not.toBeInTheDocument();
  });
});
