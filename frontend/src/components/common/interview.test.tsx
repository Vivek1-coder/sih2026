import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Interview from "./interview";

const mocks = vi.hoisted(() => ({
  startInterview: vi.fn(),
  submitAnswer: vi.fn(),
  setLanguage: vi.fn(),
  navigate: vi.fn(),
  startListening: vi.fn(),
  stopListening: vi.fn(),
  stopSpeaking: vi.fn(),
  speak: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("../../services/interview", () => ({
  startInterview: mocks.startInterview,
  submitAnswer: mocks.submitAnswer,
}));
vi.mock("../../hooks/useAuth", () => ({
  default: () => ({
    preferredLanguage: "en-IN",
    setPreferredLanguage: mocks.setLanguage,
  }),
}));
vi.mock("../../hooks/useAccessibility", () => ({
  default: () => ({ t: (key: string) => key }),
}));
vi.mock("../../hooks/useSpeech", () => ({
  default: () => ({
    listening: false,
    speaking: false,
    transcript: "",
    speechRecognitionSupported: true,
    speechSynthesisSupported: true,
    startListening: mocks.startListening,
    stopListening: mocks.stopListening,
    stopSpeaking: mocks.stopSpeaking,
    speak: mocks.speak,
  }),
}));
vi.mock("./patientShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const activeSession = {
  id: "session-1",
  patient_id: "patient-1",
  preferred_language: "en-IN",
  department: "general_medicine",
  status: "active",
  priority: "routine",
  progress: 10,
  answers: [],
  alerts: [],
  triage_required: false,
  current_question: {
    id: "breathing",
    text: "Are you short of breath?",
    section: "Symptoms",
    input_type: "single_choice",
    required: true,
    source: "ontology",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
};

const completedSession = {
  ...activeSession,
  status: "completed",
  progress: 100,
  current_question: null,
  triage_required: false,
};

const triageSession = {
  ...activeSession,
  triage_required: true,
  priority: "urgent",
  alerts: [
    {
      id: "alert-1",
      rule_id: "chest_pain_with_dyspnoea",
      reason: "Chest pain with breathlessness",
      priority: "urgent",
      evidence: ["chest pain", "shortness of breath"],
      created_at: new Date().toISOString(),
    },
  ],
};

describe("Interview voice and touch input", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.startInterview.mockResolvedValue(activeSession);
    mocks.submitAnswer.mockResolvedValue(completedSession);
    mocks.startListening.mockImplementation(
      (callback: (text: string) => void) => callback("spoken answer"),
    );
  });

  // ── existing tests ────────────────────────────────────────────────────

  it("submits a tappable answer option", async () => {
    render(<Interview go={mocks.navigate} />);
    fireEvent.click(await screen.findByRole("button", { name: "Yes" }));
    await waitFor(() =>
      expect(mocks.submitAnswer).toHaveBeenCalledWith(
        "session-1",
        "breathing",
        "yes",
        "touch",
      ),
    );
  });

  it("captures a voice transcript and submits it", async () => {
    render(<Interview go={mocks.navigate} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Start recording" }),
    );
    expect(screen.getByRole("textbox", { name: "Your answer" })).toHaveValue(
      "spoken answer",
    );
    fireEvent.click(screen.getByRole("button", { name: "Send answer" }));
    await waitFor(() =>
      expect(mocks.submitAnswer).toHaveBeenCalledWith(
        "session-1",
        "breathing",
        "spoken answer",
        "voice",
      ),
    );
  });

  // ── new tests ─────────────────────────────────────────────────────────

  it("renders a fetched question with both voice and touch affordances", async () => {
    render(<Interview go={mocks.navigate} />);
    // Touch: option buttons
    await screen.findByRole("button", { name: "Yes" });
    await screen.findByRole("button", { name: "No" });
    // Voice: mic button
    await screen.findByRole("button", { name: "Start recording" });
    // Text: answer textbox
    await screen.findByRole("textbox", { name: "Your answer" });
  });

  it("submitting a touch answer calls the answer service with touch mode", async () => {
    mocks.submitAnswer.mockResolvedValue({
      ...activeSession,
      progress: 25,
      answers: [{ id: "a1", question_id: "breathing", question_text: "Are you short of breath?", section: "Symptoms", value: "no", input_mode: "touch", answered_at: new Date().toISOString() }],
    });
    render(<Interview go={mocks.navigate} />);
    fireEvent.click(await screen.findByRole("button", { name: "No" }));
    await waitFor(() =>
      expect(mocks.submitAnswer).toHaveBeenCalledWith(
        "session-1", "breathing", "no", "touch",
      ),
    );
  });

  it("voice transcript populates the editable answer field before submit", async () => {
    render(<Interview go={mocks.navigate} />);
    await screen.findByRole("button", { name: "Start recording" });
    fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
    const textbox = screen.getByRole("textbox", { name: "Your answer" });
    expect(textbox).toHaveValue("spoken answer");
    // has not submitted yet
    expect(mocks.submitAnswer).not.toHaveBeenCalled();
  });

  it("a red_flag answer response triggers navigation to /patient/triage-alert", async () => {
    mocks.submitAnswer.mockResolvedValue(triageSession);
    render(<Interview go={mocks.navigate} />);
    fireEvent.click(await screen.findByRole("button", { name: "Yes" }));
    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith(
        "/patient/triage-alert",
        expect.objectContaining({ alerts: triageSession.alerts }),
      ),
    );
  });

  it("network failure on next-question shows a retry state, not a crash", async () => {
    mocks.startInterview.mockRejectedValue(new Error("Network error"));
    render(<Interview go={mocks.navigate} />);
    const errorMsg = await screen.findByRole("alert");
    expect(errorMsg).toHaveTextContent("Network error");
    // Retry button present
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("progress indicator updates as answers are submitted", async () => {
    const sessionWithProgress = {
      ...activeSession,
      progress: 42,
      answers: [{ id: "a1", question_id: "breathing", question_text: "Are you short of breath?", section: "Symptoms", value: "no", input_mode: "touch", answered_at: new Date().toISOString() }],
    };
    mocks.submitAnswer.mockResolvedValue(sessionWithProgress);
    render(<Interview go={mocks.navigate} />);
    fireEvent.click(await screen.findByRole("button", { name: "No" }));
    await waitFor(() => {
      expect(screen.getByText("42%")).toBeInTheDocument();
    });
  });
});
