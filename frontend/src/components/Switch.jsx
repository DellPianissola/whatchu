import './Switch.css'

const Switch = ({ checked, onChange, label, disabled = false }) => (
  <label className="ui-switch">
    <input
      type="checkbox"
      className="ui-switch-input"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
    />
    <span className="ui-switch-track" />
    <span className="ui-switch-text">{label}</span>
  </label>
)

export default Switch
