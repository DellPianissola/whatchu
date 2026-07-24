import './Toolbar.css'

const Toolbar = ({ search, scope, sheetTrigger, sort, filters, className = '' }) => (
  <div className={`ui-toolbar ${className}`.trim()}>
    <div className="ui-toolbar-search">{search}</div>
    <div className="ui-toolbar-scope">{scope}</div>

    <div className="ui-toolbar-advanced">
      {sort}
      <div className="ui-toolbar-filters">{filters}</div>
    </div>

    {sheetTrigger}
  </div>
)

export default Toolbar
