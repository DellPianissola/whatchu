import './GeoPlaceholder.css'

const GeoPlaceholder = ({ hint, animated = false, className = '' }) => (
  <div className={`ui-geo ${animated ? 'is-animated' : ''} ${className}`.trim()}>
    <div className="ui-geo-ring ui-geo-ring--1" />
    <div className="ui-geo-ring ui-geo-ring--2" />
    <div className="ui-geo-ring ui-geo-ring--3" />
    <div className="ui-geo-triangle ui-geo-triangle--1" />
    <div className="ui-geo-triangle ui-geo-triangle--2" />
    <div className="ui-geo-bar ui-geo-bar--1" />
    <div className="ui-geo-bar ui-geo-bar--2" />
    <div className="ui-geo-dot ui-geo-dot--1" />
    <div className="ui-geo-dot ui-geo-dot--2" />
    {hint && <div className="ui-geo-hint">{hint}</div>}
  </div>
)

export default GeoPlaceholder
