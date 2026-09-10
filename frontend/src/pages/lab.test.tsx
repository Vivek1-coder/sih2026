import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import LabWorkflow from "./lab";
import { translate } from "../i18n/locales";

const mocks = vi.hoisted(() => ({
  lookup: vi.fn(),
  register: vi.fn(),
  verify: vi.fn(),
  upload: vi.fn(),
  report: vi.fn(),
}));
vi.mock("../services/lab", () => ({
  lookupLabPatient: mocks.lookup,
  registerLabPatient: mocks.register,
  verifyLabPatient: mocks.verify,
  uploadLabReport: mocks.upload,
  getLabReport: mocks.report,
}));
vi.mock("../components/layout/header", () => ({
  default: ({ section }: { section: string }) => (
    <nav aria-label="Current section">{section}</nav>
  ),
}));
vi.mock("../components/layout/footer", () => ({ default: () => <footer /> }));
const t = (key: string) => translate("en-IN", key);
vi.mock("../hooks/useAccessibility", () => ({ default: () => ({ t }) }));
const patient = {
  id: "patient-1",
  full_name: "Test Patient",
  date_of_birth: "1990-01-01",
  gender: "Other",
  address: "Test address",
  mobile: "9000000000",
  email: null,
  aadhaar_masked: "XXXX-XXXX-1234",
  abha_id: null,
  processing_consent: false,
};
beforeEach(() => vi.clearAllMocks());

it("matches an existing patient, requires confirmation and consent, then uploads through processing", async () => {
  mocks.lookup.mockResolvedValue({ matched: true, patient });
  mocks.verify.mockResolvedValue({
    patient,
    verification_id: "verification-1",
  });
  mocks.upload.mockResolvedValue({
    id: "report-1",
    status: "pending",
    original_filename: "lab.pdf",
  });
  mocks.report.mockResolvedValue({
    id: "report-1",
    status: "done",
    original_filename: "lab.pdf",
  });
  render(
    <MemoryRouter>
      <LabWorkflow />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Patient identifier"), {
    target: { value: "9000000000" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Find patient" }));
  await screen.findByDisplayValue("Test Patient");
  expect(mocks.register).not.toHaveBeenCalled();
  const verify = screen.getByRole("button", {
    name: "Confirm details and authorization",
  });
  expect(verify).toBeDisabled();
  fireEvent.click(screen.getByLabelText(/I have checked these details/));
  expect(verify).toBeDisabled();
  fireEvent.click(screen.getByLabelText(/The patient has authorized/));
  fireEvent.click(verify);
  const input = await screen.findByLabelText("Choose lab report");
  const file = new File(["%PDF test"], "lab.pdf", { type: "application/pdf" });
  fireEvent.change(input, { target: { files: [file] } });
  await waitFor(() =>
    expect(mocks.upload).toHaveBeenCalledWith(
      "patient-1",
      "verification-1",
      file,
    ),
  );
  expect(
    await screen.findByRole("heading", { name: "Report saved" }),
  ).toBeInTheDocument();
});

it("shows minimal registration only after an exact search returns no match", async () => {
  mocks.lookup.mockResolvedValue({ matched: false, patient: null });
  render(
    <MemoryRouter>
      <LabWorkflow />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Identifier type"), {
    target: { value: "email" },
  });
  fireEvent.change(screen.getByLabelText("Patient identifier"), {
    target: { value: "new@example.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Find patient" }));
  expect(
    await screen.findByRole("heading", { name: "Register a new patient" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Email (optional)")).toHaveValue(
    "new@example.com",
  );
  expect(mocks.lookup).toHaveBeenCalledWith("email", "new@example.com");
  expect(mocks.register).not.toHaveBeenCalled();
});

it("clears the previous patient when returning to the search", async () => {
  mocks.lookup.mockResolvedValue({ matched: true, patient });
  render(
    <MemoryRouter>
      <LabWorkflow />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Patient identifier"), {
    target: { value: "9000000000" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Find patient" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Choose a different patient" }),
  );
  expect(screen.getByLabelText("Patient identifier")).toHaveValue("");
  expect(screen.queryByDisplayValue("Test Patient")).not.toBeInTheDocument();
});
