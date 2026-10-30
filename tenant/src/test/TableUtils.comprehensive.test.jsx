import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportTableData, printTableData } from "../utils/TableUtils";

describe("TableUtils", () => {
  describe("exportTableData", () => {
    let mockClick;
    let mockCreateObjectURL;

    beforeEach(() => {
      mockClick = vi.fn();
      mockCreateObjectURL = vi.fn(() => "blob:url");
      vi.spyOn(document, "createElement").mockReturnValue({
        click: mockClick,
        href: "",
        download: "",
      });
      vi.stubGlobal("URL", { createObjectURL: mockCreateObjectURL });
      vi.stubGlobal("Blob", class MockBlob {
        constructor(content, options) {
          this.content = content;
          this.options = options;
        }
      });
    });

    it("exports with columns", () => {
      const data = [{ name: "Alice", age: "30" }];
      const columns = [
        { header: "Name", key: "name" },
        { header: "Age", key: "age" },
      ];
      exportTableData(data, columns, "test.csv", "Test");
      expect(mockClick).toHaveBeenCalled();
    });

    it("exports without columns (object data)", () => {
      const data = { key1: "value1", key2: "value2" };
      exportTableData(data, [], "test.csv", "Test");
      expect(mockClick).toHaveBeenCalled();
    });

    it("handles missing values gracefully", () => {
      const data = [{ name: "Alice" }];
      const columns = [
        { header: "Name", key: "name" },
        { header: "Email", key: "email" },
      ];
      exportTableData(data, columns, "test.csv");
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe("printTableData", () => {
    let mockPrintWindow;

    beforeEach(() => {
      mockPrintWindow = {
        document: {
          write: vi.fn(),
          close: vi.fn(),
        },
        print: vi.fn(),
      };
      vi.spyOn(window, "open").mockReturnValue(mockPrintWindow);
    });

    it("prints with columns", () => {
      const data = [{ name: "Alice", age: "30" }];
      const columns = [
        { header: "Name", key: "name" },
        { header: "Age", key: "age" },
      ];
      printTableData(data, columns, "Test Table");
      expect(mockPrintWindow.document.write).toHaveBeenCalled();
      expect(mockPrintWindow.print).toHaveBeenCalled();
      const html = mockPrintWindow.document.write.mock.calls[0][0];
      expect(html).toContain("Test Table");
      expect(html).toContain("Alice");
    });

    it("prints without columns (object data)", () => {
      const data = { key1: "value1", key2: "value2" };
      printTableData(data, [], "Object Table");
      expect(mockPrintWindow.document.write).toHaveBeenCalled();
      const html = mockPrintWindow.document.write.mock.calls[0][0];
      expect(html).toContain("key1");
      expect(html).toContain("value1");
    });

    it("escapes HTML in data", () => {
      const data = [{ name: '<script>alert("xss")</script>' }];
      const columns = [{ header: "Name", key: "name" }];
      printTableData(data, columns, "XSS Test");
      const html = mockPrintWindow.document.write.mock.calls[0][0];
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });

    it("handles object values in key-value mode", () => {
      const data = { nested: { a: 1 } };
      printTableData(data, [], "Nested");
      const html = mockPrintWindow.document.write.mock.calls[0][0];
      expect(html).toContain("nested");
    });
  });

  describe("exportTableToPDF", () => {
    it("is an async function", async () => {
      const mod = await import("../utils/TableUtils");
      expect(typeof mod.exportTableToPDF).toBe("function");
    });
  });
});
