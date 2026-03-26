export default function PageHeader({ icon, iconClass, title, description }) {
  return (
    <div className="page-header">
      <div className="page-header-content">
        <div className={`page-icon ${iconClass || ''}`}>
          {icon}
        </div>
        <div>
          <h1 className="page-title">{title}</h1>
          {description && <p className="page-description">{description}</p>}
        </div>
      </div>
    </div>
  )
}
