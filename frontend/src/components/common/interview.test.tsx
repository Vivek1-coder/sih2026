import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Interview from "./interview";

const mocks = vi.hoisted(() => ({
  startInterview: vi.fn(),
  submitAnswer: vi.fn(),
  setLanguage: vi.fn(),
  startListening: vi.fn(),
  stopListening: vi.fn(),
  stopSpeaking: vi.fn(),
  speak: vi.fn(),
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

  it("submits a tappable answer option", async () => {
    render(<Interview go={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Yes" }));
    await waitFor(() =>
      expect(mocks.submitAnswer).toHaveBeenCalledWith(
        "session-1",
        "breathing",
        "yes",
      ),
    );
  });

  it("captures a voice transcript and submits it", async () => {
    render(<Interview go={vi.fn()} />);
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
      ),
    );
  });
});
