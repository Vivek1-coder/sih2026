import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import PatientHome from "./patientHome";
import PatientProfile from "./patientProfile";
import PatientLocation from "./patientLocation";
import { translate } from "../i18n/locales";

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  status: vi.fn(),
  stop: vi.fn(),
}));
vi.mock("../services/patient", () => ({
  patientRequest: mocks.request,
  getSessionStatus: mocks.status,
}));
const t = (key: string) => translate("en-IN", key);
vi.mock("../hooks/useAccessibility", () => ({
  default: () => ({ t, language: "en-IN" }),
}));
vi.mock("../hooks/useSpeech", () => ({
  default: () => ({ stopSpeaking: mocks.stop }),
}));
vi.mock("../components/common/patientShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe("Patient continuity", () => {
  it("shows exactly three choices and disables resume without a server session", async () => {
    mocks.status.mockResolvedValue({ resumable: false, session: null });
    render(
      <MemoryRouter>
        <PatientHome />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.queryByRole("status")).not.toBeInTheDocument(),
    );
    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(
      screen.getByRole("button", { name: /Continue Previous Session/ }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /Patient Profile/ }),
    ).toBeEnabled();
  });

  it("enables resume only after loading a resumable visit", async () => {
    mocks.status.mockResolvedValue({
      resumable: true,
      session: { id: "visit-1", location: "Clinic" },
    });
    render(
      <MemoryRouter>
        <PatientHome />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Continue Previous Session/ }),
      ).toBeEnabled(),
    );
  });

  it("requires a nonblank location before starting a visit", async () => {
    mocks.request.mockResolvedValue({ locations: [] });
    render(
      <MemoryRouter>
        <PatientLocation />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Location name"), {
      target: { value: "   " },
    });
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Location name"), {
      target: { value: "Home" },
    });
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("supports keyboard tab navigation and displays the saved QR", async () => {
    mocks.request.mockResolvedValue({
      profile: { full_name: "Test patient", allergies: [] },
      medications: [],
      documents: [],
      sessions: [],
      audit_log: [],
      medication_summary: {
        id: "summary-1",
        generated_at: "2026-09-06T10:00:00Z",
        content: "Recorded medicines",
        qr_image: "data:image/png;base64,test",
        confirmed: true,
      },
    });
    render(
      <MemoryRouter>
        <PatientProfile />
      </MemoryRouter>,
    );
    const details = await screen.findByRole("tab", { name: "Profile Details" });
    expect(screen.getAllByRole("tab")).toHaveLength(5);
    fireEvent.keyDown(details, { key: "End" });
    expect(
      screen.getByRole("tab", { name: "Medication Summary" }),
    ).toHaveFocus();
    expect(screen.getByText("Recorded medicines")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "data:image/png;base64,test",
    );
  });
});
