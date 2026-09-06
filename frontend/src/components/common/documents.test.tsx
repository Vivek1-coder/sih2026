import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Documents from "./documents";

const mocks = vi.hoisted(() => ({
  getConsent: vi.fn(),
  listDocuments: vi.fn(),
  uploadDocument: vi.fn(),
  deleteDocument: vi.fn(),
}));
vi.mock("../../services/consent", () => ({ getConsent: mocks.getConsent }));
vi.mock("../../services/documents", () => ({
  listDocuments: mocks.listDocuments,
  uploadDocument: mocks.uploadDocument,
  deleteDocument: mocks.deleteDocument,
}));
vi.mock("../../hooks/useAccessibility", () => ({
  default: () => ({ t: (key: string) => key }),
}));
vi.mock("./patientShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

describe("Documents upload flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getConsent.mockResolvedValue({
      status: "active",
      choices: { document_processing: true },
    });
    mocks.listDocuments.mockResolvedValue([]);
    mocks.uploadDocument.mockResolvedValue({
      id: "doc-1",
      original_filename: "report.pdf",
      content_type: "application/pdf",
      size_bytes: 4,
      status: "done",
      document_date: "2026-08-29",
      extraction: null,
      error: null,
      uploaded_at: "2026-08-29",
      updated_at: "2026-08-29",
    });
  });

  it("uploads a selected PDF after consent is loaded", async () => {
    const { container } = render(<Documents/>);
    await screen.findByRole("button", { name: /browse files/i });
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(["%PDF"], "report.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() =>
      expect(mocks.uploadDocument).toHaveBeenCalledWith(file, "other"),
    );
  });
});
