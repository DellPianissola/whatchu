import Spinner from './Spinner.jsx'
import './LoadingScreen.css'

const LoadingScreen = ({ label = 'Carregando' }) => (
  <div className="ui-loading-screen">
    <Spinner size="lg" label={label} />
    <p className="ui-loading-screen-label">{label}…</p>
  </div>
)

export default LoadingScreen
