import Header from "../components/layout/header";

export default  function NotFound({ go }: { go: (p: string) => void }) {
  return (
    <>
      <Header go={go} />
      <div className="not-found">
        <h1>Page not found</h1>
        <p>Let’s get you back to a safe place.</p>
        <button className="button primary" onClick={() => go("/")}>
          Return home
        </button>
      </div>
    </>
  );
}