export default function Footer() {
  return (
    <footer className="site-footer">
      <span className="footer-copyright">© {new Date().getFullYear()} Frivaro</span>
      <nav className="footer-links">
        <a href="https://frivaro.com/about">About</a>
        <a href="https://frivaro.com/help">Help</a>
        <a href="https://frivaro.com/privacy">Privacy</a>
        <a href="https://frivaro.com/terms">Terms</a>
        <a href="https://github.com/frivaro" target="_blank" rel="noreferrer">
          GitHub
        </a>
        <a href="https://www.youtube.com/@frivaro" target="_blank" rel="noreferrer">
          YouTube
        </a>
        <a href="https://www.linkedin.com/company/frivaro" target="_blank" rel="noreferrer">
          LinkedIn
        </a>
      </nav>
    </footer>
  );
}
