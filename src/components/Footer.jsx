function Footer() {
  return (
    <footer className="bg-dark text-white text-center py-3">
      <div className="container">
        <small>
          © {new Date().getFullYear()} Mi Proyecto React
        </small>
      </div>
    </footer>
  );
}

export default Footer;