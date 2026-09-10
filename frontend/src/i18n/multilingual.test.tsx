import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import AuthProvider from '../context/AuthContext';
import AccessibilityProvider from '../context/AccessibilityContext';
import Interview from '../components/common/interview';
import LabWorkflow from '../pages/lab';
import i18n, { ui } from './index';
import { apiError, apiFetch } from '../services/api';
import { withTimeout } from '../utils/withTimeout';
import { createInstance } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const mocks = vi.hoisted(() => ({
  start: vi.fn(), answer: vi.fn(), lookup: vi.fn(), verify: vi.fn(), upload: vi.fn(), report: vi.fn(),
  stop: vi.fn(), speak: vi.fn(),
}));
vi.mock('../services/auth', () => ({ restoreSession: async () => null, logout: async () => undefined }));
vi.mock('../services/interview', () => ({ startInterview: mocks.start, submitAnswer: mocks.answer }));
vi.mock('../services/lab', () => ({ lookupLabPatient: mocks.lookup, verifyLabPatient: mocks.verify,
  registerLabPatient: vi.fn(), uploadLabReport: mocks.upload, getLabReport: mocks.report }));
vi.mock('../hooks/useSpeech', () => ({ default: () => ({
  listening: false, speaking: false, transcript: '', speechRecognitionSupported: true, speechSynthesisSupported: true,
  stopListening: mocks.stop, stopSpeaking: mocks.stop, speak: mocks.speak, startListening: vi.fn(),
}) }));

const session = { id: 's1', preferred_language: 'en-IN', status: 'active', department: 'general_medicine', answers: [], alerts: [],
  current_question: { id: 'chief_complaint', text: 'What brings you in today?', section: 'Chief complaint', input_type: 'single_choice',
    options: [{ value: 'headache', label: 'Headache' }], source: 'ontology' }, progress: 0 };
function mount(view: React.ReactNode, path = '/') {
  return render(<I18nextProvider i18n={i18n}><MemoryRouter initialEntries={[path]}><AuthProvider><AccessibilityProvider>{view}</AccessibilityProvider></AuthProvider></MemoryRouter></I18nextProvider>);
}
beforeEach(async () => {
  vi.clearAllMocks();
  await i18n.changeLanguage('en');
  mocks.start.mockResolvedValue(session);
});
afterEach(async () => { vi.useRealTimers(); vi.unstubAllGlobals(); await i18n.changeLanguage('en'); });

it('switches the navbar, current question and options while retaining a typed answer', async () => {
  mount(<Interview />);
  const input = await screen.findByPlaceholderText('Type your answer here…');
  fireEvent.change(input, { target: { value: 'My unsent answer' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), { target: { value: 'hi-IN' } });
  expect(await screen.findByText('आज आपको क्या तकलीफ़ है?')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'सिरदर्द' })).toBeInTheDocument();
  expect(screen.getByPlaceholderText('अपना उत्तर यहाँ लिखें…')).toHaveValue('My unsent answer');
  expect(document.documentElement.lang).toBe('hi');
  expect(window.localStorage.getItem('medikiosk-language')).toBe('hi');
  await waitFor(() => expect(screen.getByRole('button', { name: 'उत्तर भेजें' })).toBeEnabled());
});

it('shows one response-wait indicator and disables the mic until submission settles', async () => {
  let resolve!: (value: typeof session) => void;
  mocks.answer.mockReturnValue(new Promise(done => { resolve = done; }));
  mount(<Interview />);
  const option = await screen.findByRole('button', { name: 'Headache' });
  await waitFor(() => expect(option).toBeEnabled());
  fireEvent.click(option);
  expect(screen.getByRole('status')).toHaveTextContent('Waiting for the next question');
  expect(screen.getByRole('button', { name: 'Start recording' })).toBeDisabled();
  await act(async () => resolve(session));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('translates an existing error without clearing the pending answer', async () => {
  mocks.answer.mockRejectedValue(new Error('errors:timeout'));
  mount(<Interview />);
  const option = await screen.findByRole('button', { name: 'Headache' });
  await waitFor(() => expect(option).toBeEnabled());
  fireEvent.click(option);
  expect(await screen.findByRole('alert')).toHaveTextContent(ui('errors:timeout'));
  expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled();
});

it('keeps the verified patient and form details when switching the lab language', async () => {
  mocks.lookup.mockResolvedValue({ patient: { id: 'p1', full_name: 'Test Patient', date_of_birth: '1990-01-01', gender: 'Other', mobile: '9000000000' } });
  mount(<LabWorkflow />);
  fireEvent.change(screen.getByLabelText('Patient identifier'), { target: { value: '9000000000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Find patient' }));
  await screen.findByDisplayValue('Test Patient');
  fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), { target: { value: 'hi-IN' } });
  expect(screen.getByDisplayValue('Test Patient')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'विवरण और अनुमति की पुष्टि करें' })).toBeDisabled();
  expect(mocks.lookup).toHaveBeenCalledTimes(1);
});

it('covers every English namespace key in Hindi, including all scripted questions', () => {
  const en = i18n.getDataByLanguage('en')!;
  const hi = i18n.getDataByLanguage('hi')!;
  for (const [namespace, entries] of Object.entries(en)) {
    for (const key of Object.keys(entries)) expect(hi[namespace]?.[key], `${namespace}:${key}`).toBeTruthy();
  }
});

it('sends the selected locale and preserves API message codes for later translation', async () => {
  await i18n.changeLanguage('hi');
  const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
  vi.stubGlobal('fetch', fetchMock);
  await apiFetch('/api/patient/profile');
  expect(fetchMock.mock.calls[0][1].headers['Accept-Language']).toBe('hi-IN');
  expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  const error = await apiError(new Response(JSON.stringify({ code: 'validation' }), { status: 422 }));
  expect(error.message).toBe('errors:validation');
});

it('bounds stalled route imports so the boundary can show retry', async () => {
  vi.useFakeTimers();
  const pending = withTimeout(new Promise(() => undefined), 20000);
  const assertion = expect(pending).rejects.toThrow('errors:timeout');
  await vi.advanceTimersByTimeAsync(20000);
  await assertion;
});

it('restores Hindi from local storage on a fresh initialization', async () => {
  window.localStorage.setItem('medikiosk-language', 'hi');
  const restored = createInstance();
  await restored.use(LanguageDetector).init({
    resources: { en: { common: { label: 'English' } }, hi: { common: { label: 'हिंदी' } } },
    fallbackLng: 'en', supportedLngs: ['en', 'hi'], defaultNS: 'common',
    detection: { order: ['localStorage', 'navigator'], lookupLocalStorage: 'medikiosk-language' },
  });
  expect(restored.resolvedLanguage).toBe('hi');
});

it('stops lab polling at the deadline and exposes a retry without losing the report', async () => {
  vi.useFakeTimers();
  mocks.report.mockResolvedValue({ id: 'r1', status: 'processing', processing_stage: 'extracting', original_filename: 'report.pdf' });
  mount(<LabWorkflow />, '/lab?report=r1');
  await act(async () => { await vi.advanceTimersByTimeAsync(121000); });
  expect(screen.getByRole('alert')).toHaveTextContent(ui('errors:timeout'));
  expect(screen.getByRole('button', { name: 'Refresh status' })).toBeEnabled();
  expect(screen.getByText('report.pdf')).toBeInTheDocument();
  const calls = mocks.report.mock.calls.length;
  await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
  expect(mocks.report).toHaveBeenCalledTimes(calls);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Refresh status' })); });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
