import { createPortal } from "react-dom";
import "./Loader.css";

const Loader = () =>
  createPortal(
    <div className="loader-overlay">
      <div className="loader">
        {/* Las bolitas animadas se generan con los pseudoelementos del CSS */}
      </div>
    </div>,
    document.body
  );

export default Loader;