import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function PageBanner({
  label = "THE INFINITY EXPERIENCE",
  title,
  description,
  image = "/images/cinema-auditorium.jpg",
  children,
}) {
  return (
    <header className="page-banner">
      <img className="page-banner-image" src={image} alt="" />
      <div className="content-width page-banner-inner">
        <nav aria-label="Đường dẫn" className="page-breadcrumb">
          <Link href="/">NOVA Cinema</Link>
          <span>/</span>
          <span>{label}</span>
        </nav>
        <p className="nova-kicker">{label}</p>
        <h1>{title}</h1>
        <p className="page-banner-description">{description}</p>
        {children}
        <span className="banner-signature">
          MAKE IT A MOVIE NIGHT <ArrowUpRight size={18} />
        </span>
      </div>
    </header>
  );
}
