import {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import arlLogoSrc from "./assets/arllogo.svg"
import arlFullnameSrc from "./assets/arlfullname.svg"
import arlFullnameDarkSrc from "./assets/arlfullname-dark.svg"
import greenwichLogoSrc from "./assets/2022-Greenwich-Eng.webp"
import greenwichLogoDarkSrc from "./assets/greenwich-logo-dark.svg"
import { CmsContext, CmsContent, assetUrl, cmsHref, cmsLang, cmsPath, cmsSearch, navigationFor, pageByKey, placedIds, productsFor, researchFor, siteSetting, useCms } from "./cmsContent"
import CmsMarkdown from "./CmsMarkdown"

type Lang = "vi" | "en"

const copy = {
  vi: {
    nav: {
      products: "Sản phẩm",
      allProducts: "Tất cả Sản phẩm",
      print: "In 3D",
      robot: "Robot Tự hành",
      solutions: "Giải pháp",
      desktop: "Tự động hóa Desktop & Web",
      robotics: "Tự động hóa Robot",
      zalo: "AI Agent Zalo",
      research: "Nghiên cứu",
      areas: "Lĩnh vực Nghiên cứu",
      publications: "Công bố",
      open: "Mã nguồn mở",
      about: "Giới thiệu",
      contact: "Liên hệ",
      demo: "Đặt lịch Demo",
      explore: "Khám phá Sản phẩm",
      menu: "Open navigation menu",
      switch: "Switch to English",
    },
    footer: {
      blurb:
        "Xây dựng hệ thống thông minh hoạt động trong thế giới thực. Tự động hóa AI, robot và nghiên cứu.",
      lab: "Lab",
      about: "Về ARL",
      privacy: "Chính sách Bảo mật",
      terms: "Điều khoản Sử dụng",
      privacyShort: "Bảo mật",
      termsShort: "Điều khoản",
      top: "Lên đầu",
    },
    home: {
      title: "Xây dựng hệ thống thông minh hoạt động trong thế giới thực.",
      intro:
        "Chúng tôi phát triển AI workflow agent, robot tự hành và giải pháp tự động hóa — từ tự động hóa desktop đến hệ thống robot vật lý.",
      productsEyebrow: "Sản phẩm",
      productsTitle: "Công cụ được xây dựng cho thế giới thực",
      productsIntro:
        "Công cụ thực tiễn từ nghiên cứu ứng dụng — không chỉ là demo, mà là hệ thống thực sự bạn có thể sử dụng ngay hôm nay.",
      capabilities: "Năng lực",
      capabilitiesTitle: "Năng lực cốt lõi",
      capabilitiesIntro:
        "Nghiên cứu ứng dụng và sản phẩm thực tiễn bao gồm AI agent, robot và tự động hóa.",
      researchTitle: "Nghiên cứu ứng dụng cho hệ thống thực",
      researchIntro:
        "Nghiên cứu của chúng tôi thu hẹp khoảng cách giữa tiến bộ học thuật và triển khai thực tiễn — tập trung vào AI agent, điều hướng tự hành và thị giác máy tính.",
      exploreResearch: "Khám phá Nghiên cứu",
      ready: "Sẵn sàng làm việc cùng ARL?",
      readyText:
        "Dù bạn muốn tự động hóa quy trình, khám phá quan hệ đối tác nghiên cứu, hay triển khai giải pháp robot — chúng tôi rất muốn nói chuyện.",
      different: "Có câu hỏi khác? Gửi tin nhắn cho chúng tôi",
      message: "Gửi tin nhắn cho chúng tôi",
    },
    common: {
      goHome: "Về Trang chủ",
      details: "Chi tiết",
      access: "Nhận quyền truy cập",
      learn: "Tìm hiểu thêm",
      all: "Tất cả",
      features: "Tính năng",
      whatCanDo: "Những gì sản phẩm có thể làm",
      workflows: "Quy trình ứng dụng",
      builtFor: "Quy trình ứng dụng",
      start: "Bắt đầu",
      ready: "Sẵn sàng bắt đầu?",
      contactUs: "Liên hệ chúng tôi",
      availableOn: "Có sẵn trên:",
      watchDemo: "Xem Demo",
      products: "Sản phẩm",
      research: "Nghiên cứu",
      collab: "Yêu cầu Hợp tác Nghiên cứu",
    },
  },
  en: {
    nav: {
      products: "Products",
      allProducts: "All Products",
      print: "3D Printing",
      robot: "Autonomous Robot Vehicle",
      solutions: "Solutions",
      desktop: "Desktop & Web Automation",
      robotics: "Robotics Automation",
      zalo: "Zalo AI Agents",
      research: "Research",
      areas: "Research Areas",
      publications: "Publications",
      open: "Open Source",
      about: "About",
      contact: "Contact",
      demo: "Request Demo",
      explore: "Explore Products",
      menu: "Open navigation menu",
      switch: "Chuyển sang Tiếng Việt",
    },
    footer: {
      blurb:
        "Building intelligent systems that act in the real world. AI automation, robotics, and research.",
      lab: "Lab",
      about: "About ARL",
      privacy: "Privacy Policy",
      terms: "Terms of Use",
      privacyShort: "Privacy",
      termsShort: "Terms",
      top: "Top",
    },
    home: {
      title: "Building intelligent systems that act in the real world.",
      intro:
        "We build AI workflow agents, autonomous robots, and automation solutions — from rapid desktop automation to physical robotics systems.",
      productsEyebrow: "Products",
      productsTitle: "Tools built for the real world",
      productsIntro:
        "Practical tools born from applied research — not demos, but practical systems you can use today.",
      capabilities: "Capabilities",
      capabilitiesTitle: "Core capabilities",
      capabilitiesIntro:
        "Applied research and real products spanning AI agents, robotics, and automation.",
      researchTitle: "Applied research for real systems",
      researchIntro:
        "Our research bridges the gap between academic progress and practical deployment — focusing on AI agents, autonomous navigation, and computer vision.",
      exploreResearch: "Explore Research",
      ready: "Ready to work with ARL?",
      readyText:
        "Whether you want to automate your workflows, explore a research partnership, or deploy a robotics solution — we'd love to talk.",
      different: "Have a different question? Send us a message",
      message: "Send us a message",
    },
    common: {
      goHome: "Go Home",
      details: "Details",
      access: "Get Access",
      learn: "Learn more",
      all: "All",
      features: "Features",
      whatCanDo: "What the product can do",
      workflows: "Built for these workflows",
      builtFor: "Built for these workflows",
      start: "Get Started",
      ready: "Ready to get started?",
      contactUs: "Contact Us",
      availableOn: "Available on:",
      watchDemo: "Watch Demo",
      products: "Products",
      research: "Research",
      collab: "Research Collaboration Inquiry",
    },
  },
} as const

const products = {
  vi: [
    {
      slug: "workflow-agent",
      title: "Workflow Agent",
      status: "Beta",
      categories: ["ai-automation"],
      labels: ["Tự động hóa AI", "Tự động hóa Desktop"],
      desc: "Tác nhân AI tự động hóa desktop và web — mô tả những gì bạn cần và xem nó thực thi.",
      platforms: ["Windows", "macOS"],
      uses: [
        "Xử lý tài liệu văn phòng",
        "Nghiên cứu trình duyệt & thu thập dữ liệu",
        "Sắp xếp tệp & xử lý hàng loạt",
      ],
      contact: "/contact?product=workflow-agent&type=request-access",
    },
    {
      slug: "printing-3d-models",
      title: "Giải pháp In 3D",
      status: "Sẵn sàng",
      categories: ["robotics", "3d-printing"],
      labels: ["Robot học", "In 3D"],
      desc: "Tạo mẫu nhanh và in 3D tùy chỉnh cho linh kiện robot, đồ gá nghiên cứu và phát triển sản phẩm.",
      platforms: ["Web"],
      uses: [
        "Tạo mẫu thử linh kiện robot",
        "Vỏ bọc và giá đỡ tùy chỉnh",
        "Đồ gá và đồ định vị nghiên cứu",
      ],
      contact: "/contact?product=printing-3d-models&type=product-inquiry",
    },
    {
      slug: "autonomous-robot-vehicle",
      title: "Robot tự hành",
      status: "Nghiên cứu",
      categories: ["robotics", "research-prototype"],
      labels: ["Robot học", "Mẫu thử Nghiên cứu"],
      desc: "Nền tảng nghiên cứu cho di chuyển robot tự hành — thu hẹp khoảng cách giữa thuật toán phòng thí nghiệm và triển khai thực tế.",
      platforms: ["ROS 2", "Linux"],
      uses: [
        "Nghiên cứu điều hướng tự hành",
        "Thử nghiệm thuật toán thị giác máy tính",
        "Thử nghiệm phối hợp đa robot",
      ],
      contact:
        "/contact?product=autonomous-robot-vehicle&type=research-collaboration",
    },
  ],
  en: [
    {
      slug: "workflow-agent",
      title: "Workflow Agent",
      status: "Beta",
      categories: ["ai-automation"],
      labels: ["AI Automation", "Desktop Automation"],
      desc: "An AI-powered desktop and web automation agent — describe what you need, watch it happen.",
      platforms: ["Windows", "macOS"],
      uses: [
        "Office document processing",
        "Browser research & data collection",
        "File organization & batch operations",
      ],
      contact: "/contact?product=workflow-agent&type=request-access",
    },
    {
      slug: "printing-3d-models",
      title: "3D Printing Solutions",
      status: "Available",
      categories: ["robotics", "3d-printing"],
      labels: ["Robotics", "3D Printing"],
      desc: "Rapid prototyping and custom 3D printing for robotics components, research fixtures, and product development.",
      platforms: ["Web"],
      uses: [
        "Robotics part prototyping",
        "Custom enclosures and mounts",
        "Research fixtures and jigs",
      ],
      contact: "/contact?product=printing-3d-models&type=product-inquiry",
    },
    {
      slug: "autonomous-robot-vehicle",
      title: "Autonomous Robot Vehicle",
      status: "Research",
      categories: ["robotics", "research-prototype"],
      labels: ["Robotics", "Research Prototype"],
      desc: "A research platform for autonomous mobile navigation — bridging the gap between lab algorithms and real-world deployment.",
      platforms: ["ROS 2", "Linux"],
      uses: [
        "Autonomous navigation research",
        "Computer vision algorithm testing",
        "Multi-robot coordination experiments",
      ],
      contact:
        "/contact?product=autonomous-robot-vehicle&type=research-collaboration",
    },
  ],
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string
  children: ReactNode
}

function Link({ href, children, className = "", ...props }: LinkProps) {
  return (
    <a className={className} href={cmsHref(href, cmsLang())} {...props}>
      {children}
    </a>
  )
}
function Button({
  children,
  onClick,
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={className} onClick={onClick} type={type} {...props}>
      {children}
    </button>
  )
}
function Heading({
  level = 2,
  children,
  className = "",
  id,
}: {
  level?: 1 | 2 | 3 | 4
  children: ReactNode
  className?: string
  id?: string
}) {
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4"
  return (
    <Tag className={className} id={id}>
      {children}
    </Tag>
  )
}
function Arrow() {
  return <span aria-hidden="true">↗</span>
}

function MediaPlaceholder({
  kind = "product",
  label,
}: {
  kind?: string
  label: string
}) {
  return (
    <div
      className={`media-placeholder media-${kind}`}
      role="img"
      aria-label={label}
    >
      <div className="media-grid" />
      <div className="media-orbit orbit-one" />
      <div className="media-orbit orbit-two" />
      <div className="media-core">
        <span>ARL</span>
        <i />
      </div>
      <div className="media-caption">{label}</div>
    </div>
  )
}

function Brand({
  className = "",
  isFooter = false,
}: {
  className?: string
  isFooter?: boolean
}) {
  return (
    <Link
      href="/"
      className={`brand ${isFooter ? "footer-brand-link" : ""
        } ${className}`.trim()}
      aria-label="Applied Robotics Lab"
    >
      <img
        className="brand-symbol"
        src={arlLogoSrc}
        alt=""
        aria-hidden="true"
      />
      {isFooter ? (
        <img
          className="brand-wordmark brand-wordmark-footer"
          src={arlFullnameDarkSrc}
          alt=""
          aria-hidden="true"
        />
      ) : (
        <>
          <img
            className="brand-wordmark brand-wordmark-light"
            src={arlFullnameSrc}
            alt=""
            aria-hidden="true"
          />
          <img
            className="brand-wordmark brand-wordmark-dark"
            src={arlFullnameDarkSrc}
            alt=""
            aria-hidden="true"
          />
        </>
      )}
    </Link>
  )
}

function SunIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}

function Header({
  lang,
  setLang,
  theme,
  toggleTheme,
}: {
  lang: Lang
  setLang: (l: Lang) => void
  theme: Theme
  toggleTheme: () => void
}) {
  const [open, setOpen] = useState(false)
  const cms = useCms()
  const productLinks = productsFor(cms, lang)
  const managedNav = navigationFor(cms, lang, "header")
  const t = copy[lang].nav
  const themeLabel =
    theme === "dark"
      ? lang === "vi"
        ? "Chuyển sang giao diện sáng"
        : "Switch to light mode"
      : lang === "vi"
        ? "Chuyển sang giao diện tối"
        : "Switch to dark mode"

  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand />
        <Link
          className="greenwich-link"
          href="https://greenwich.edu.vn"
          target="_blank"
        >
          <img
            className="greenwich-logo greenwich-logo-light"
            src={greenwichLogoSrc}
            alt=""
          />
          <img
            className="greenwich-logo greenwich-logo-dark"
            src={greenwichLogoDarkSrc}
            alt=""
          />
          {lang === "vi"
            ? "Đại học Greenwich Việt Nam"
            : "University of Greenwich Vietnam"}
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {managedNav.length > 0 ? managedNav.filter(x => !x.parent).map(item => <div className="nav-group" key={item.id}><Link href={item.href!}>{item.label}</Link>{managedNav.some(x => x.parent === item.id) && <div className="nav-dropdown">{managedNav.filter(x => x.parent === item.id).map(child => <Link key={child.id} href={child.href!}>{child.label}</Link>)}</div>}</div>) : <>
          <div className="nav-group">
            <Link href="/products">{t.products}</Link>
            <div className="nav-dropdown">
              <Link href="/products">{t.allProducts}</Link>
              {productLinks ? productLinks.map(p => <Link key={p.slug} href={`/products/${p.slug}`}>{p.title}</Link>) : <><Link href="/products/workflow-agent">Workflow Agent</Link><Link href="/products/printing-3d-models">{t.print}</Link><Link href="/products/autonomous-robot-vehicle">{t.robot}</Link></>}
            </div>
          </div>
          <div className="nav-group">
            <Link href="/solutions">{t.solutions}</Link>
            <div className="nav-dropdown">
              <Link href="/solutions#desktop-automation">{t.desktop}</Link>
              <Link href="/solutions#robotics">{t.robotics}</Link>
              <Link href="/solutions#zalo-agents">{t.zalo}</Link>
            </div>
          </div>
          <div className="nav-group">
            <Link href="/research">{t.research}</Link>
            <div className="nav-dropdown">
              <Link href="/research">{t.areas}</Link>
              <Link href="/research?type=publication">{t.publications}</Link>
              <Link href="/research?type=open-source">{t.open}</Link>
            </div>
          </div>
          <Link href="/about">{t.about}</Link>
          <Link href="/contact">{t.contact}</Link>
          </>}
        </nav>
        <div className="header-actions">
          <Button
            className="theme-btn"
            title={themeLabel}
            aria-label={themeLabel}
            onClick={toggleTheme}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </Button>
          <Button
            className="lang-btn"
            title={t.switch}
            aria-label={t.switch}
            onClick={() => setLang(lang === "vi" ? "en" : "vi")}
          >
            {lang.toUpperCase()}
          </Button>
          <Link className="btn btn-small" href="/contact?type=request-demo">
            {t.demo}
          </Link>
          <Button
            className="menu-btn"
            aria-label={t.menu}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <span />
            <span />
          </Button>
        </div>
      </div>
      {open && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {managedNav.length > 0 ? managedNav.filter(x => !x.parent).map(item => <div key={item.id}><Link href={item.href!} onClick={() => setOpen(false)}>{item.label}</Link>{managedNav.filter(x => x.parent === item.id).map(child => <Link key={child.id} href={child.href!} onClick={() => setOpen(false)}>{child.label}</Link>)}</div>) : <>
          <strong>{t.products}</strong>
          <div>
            <Link href="/products" onClick={() => setOpen(false)}>
              {t.allProducts}
            </Link>
            {productLinks ? productLinks.map(p => <Link key={p.slug} href={`/products/${p.slug}`} onClick={() => setOpen(false)}>{p.title}</Link>) : <><Link href="/products/workflow-agent" onClick={() => setOpen(false)}>Workflow Agent</Link><Link href="/products/printing-3d-models" onClick={() => setOpen(false)}>{t.print}</Link><Link href="/products/autonomous-robot-vehicle" onClick={() => setOpen(false)}>{t.robot}</Link></>}
          </div>
          <strong>{t.solutions}</strong>
          <div>
            <Link
              href="/solutions#desktop-automation"
              onClick={() => setOpen(false)}
            >
              {t.desktop}
            </Link>
            <Link href="/solutions#robotics" onClick={() => setOpen(false)}>
              {t.robotics}
            </Link>
            <Link href="/solutions#zalo-agents" onClick={() => setOpen(false)}>
              {t.zalo}
            </Link>
          </div>
          <strong>{t.research}</strong>
          <div>
            <Link href="/research" onClick={() => setOpen(false)}>
              {t.areas}
            </Link>
            <Link
              href="/research?type=publication"
              onClick={() => setOpen(false)}
            >
              {t.publications}
            </Link>
            <Link
              href="/research?type=open-source"
              onClick={() => setOpen(false)}
            >
              {t.open}
            </Link>
          </div>
          <Link href="/about" onClick={() => setOpen(false)}>
            {t.about}
          </Link>
          <Link href="/contact" onClick={() => setOpen(false)}>
            {t.contact}
          </Link>
          <Link
            href="/contact?type=request-demo"
            onClick={() => setOpen(false)}
          >
            {t.demo}
          </Link>
          <Link href="/products" onClick={() => setOpen(false)}>
            {t.explore}
          </Link>
          </>}
        </nav>
      )}
    </header>
  )
}

function Footer({ lang }: { lang: Lang }) {
  const cms = useCms()
  const managedFooter = (location: string) => navigationFor(cms, lang, location).map(x => [x.label, x.href!])
  const productLinks = productsFor(cms, lang)
  const researchLinks = researchFor(cms, lang)
  const email = siteSetting(cms, "contact_email", lang) || "zally.aihoc@gmail.com"
  const n = copy[lang].nav,
    f = copy[lang].footer
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <Brand isFooter />
          <p>{f.blurb}</p>
          <div className="socials">
            <Link href={`mailto:${email}`}>{email}</Link>
          </div>
        </div>
        <FooterCol
          title={n.products}
          links={managedFooter("footer_products").length ? managedFooter("footer_products") : productLinks ? [[n.allProducts, "/products"], ...productLinks.map(p => [p.title, `/products/${p.slug}`])] : [[n.allProducts, "/products"], ["Workflow Agent", "/products/workflow-agent"], [n.print, "/products/printing-3d-models"], [n.robot, "/products/autonomous-robot-vehicle"]]}
        />
        <FooterCol
          title={n.solutions}
          links={managedFooter("footer_solutions").length ? managedFooter("footer_solutions") : researchLinks ? [[n.areas, "/research"], ...researchLinks.map(x => [x[1], x[4]])] : [
            [
              lang === "vi" ? "Tự động hóa Desktop" : "Desktop Automation",
              "/solutions#desktop-automation",
            ],
            [n.robotics, "/solutions#robotics"],
            [n.zalo, "/solutions#zalo-agents"],
          ]}
        />
        <FooterCol
          title={n.research}
          links={managedFooter("footer_research").length ? managedFooter("footer_research") : [
            [n.areas, "/research"],
            [lang === "vi" ? "AI Agent" : "AI Agents", "/research/ai-agents"],
            [
              lang === "vi" ? "Điều hướng Tự hành" : "Autonomous Navigation",
              "/research/autonomous-navigation",
            ],
            [
              lang === "vi" ? "Thị giác Máy tính" : "Computer Vision",
              "/research/computer-vision",
            ],
          ]}
        />
        <FooterCol
          title={f.lab}
          links={managedFooter("footer_lab").length ? managedFooter("footer_lab") : [
            [f.about, "/about"],
            [n.contact, "/contact"],
            [f.privacy, "/privacy-policy"],
            [f.terms, "/terms-of-use"],
          ]}
        />
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} Applied Robotics Lab. All rights
          reserved.
        </span>
        <div>
          <Link href="/privacy-policy">{f.privacyShort}</Link>
          <Link href="/terms-of-use">{f.termsShort}</Link>
          <Link href="#top">{f.top} ↑</Link>
        </div>
      </div>
    </footer>
  )
}
function FooterCol({ title, links }: { title: string; links: string[][] }) {
  return (
    <div className="footer-col">
      <Heading level={4}>{title}</Heading>
      {links.map(([label, href]) => (
        <Link key={href} href={href}>
          {label}
        </Link>
      ))}
    </div>
  )
}

function PageShell({
  lang,
  setLang,
  theme,
  toggleTheme,
  children,
}: {
  lang: Lang
  setLang: (l: Lang) => void
  theme: Theme
  toggleTheme: () => void
  children: ReactNode
}) {
  return (
    <div id="top">
      <Header
        lang={lang}
        setLang={setLang}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <main id="main-content">{children}</main>
      <Footer lang={lang} />
    </div>
  )
}
function Breadcrumbs({
  lang,
  current,
  parent,
}: {
  lang: Lang
  current: string
  parent?: string
}) {
  const c = copy[lang].common
  const parentHref = parent === c.products ? "/products" : "/research"
  return (
    <div className="breadcrumbs">
      <Link href="/">{c.goHome}</Link>
      <span>/</span>
      {parent && (
        <>
          <Link href={parentHref}>{parent}</Link>
          <span>/</span>
        </>
      )}
      <span>{current}</span>
    </div>
  )
}
function PageIntro({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string
  title: string
  text?: string
}) {
  return (
    <section className="page-intro">
      <div className="container">
        <span className="eyebrow">{eyebrow}</span>
        <Heading level={1}>{title}</Heading>
        {text && <p>{text}</p>}
      </div>
    </section>
  )
}
function SectionHead({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow: string
  title: string
  text?: string
  action?: ReactNode
}) {
  return (
    <div className="section-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <Heading level={2}>{title}</Heading>
        {text && <p>{text}</p>}
      </div>
      {action}
    </div>
  )
}

function Home({ lang }: { lang: Lang }) {
  const cms = useCms()
  const homePage = pageByKey(cms, "home")
  const t = copy[lang],
    ps = (() => { const list = productsFor(cms, lang) || products[lang]; const ids = placedIds(cms, "home_products"); return ids.length ? list.filter(x => "id" in x && ids.includes(x.id)).sort((a, b) => ids.indexOf("id" in a ? a.id : "") - ids.indexOf("id" in b ? b.id : "")) : list })()
  const managedCapabilities = (cms?.Content_Blocks || []).filter(x => x.owner_type === "page" && x.owner_id === "PAGE_HOME" && x.section_key === "capabilities" && x.is_active !== false).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  const capabilities = managedCapabilities.length ? managedCapabilities.map((x, i) => [x[`title_${lang}`], x[`text_${lang}`], x.target_url || "/solutions", String(i + 1).padStart(2, "0")]) :
    lang === "vi"
      ? [
        [
          "Tự động hóa Desktop & Web",
          "Tự động hóa bất kỳ ứng dụng desktop hoặc tác vụ trình duyệt nào bằng AI. Không cần kiến thức lập trình.",
          "/solutions#desktop-automation",
          "01",
        ],
        [
          "Tích hợp Robot",
          "Hệ thống tự hành dựa trên ROS 2 cho điều hướng, thao tác và cảm biến.",
          "/solutions#robotics",
          "02",
        ],
        [
          "AI Agent Zalo",
          "Chatbot Zalo thông minh và AI agent cho quy trình kinh doanh Việt Nam.",
          "/solutions#zalo-agents",
          "03",
        ],
        [
          "AI Agent",
          "Agent lập kế hoạch và thực thi tác vụ đa bước cho các vấn đề phức tạp trong thực tế.",
          "/research/ai-agents",
          "04",
        ],
        [
          "Thị giác Máy tính",
          "Hệ thống phát hiện đối tượng, kiểm tra chất lượng và nhận thức cảnh thực tiễn.",
          "/research/computer-vision",
          "05",
        ],
        [
          "Tạo mẫu Nhanh",
          "Từ ý tưởng đến nguyên mẫu hoạt động nhanh chóng — in 3D, hệ thống nhúng và hơn thế.",
          "/products/printing-3d-models",
          "06",
        ],
      ]
      : [
        [
          "Desktop & Web Automation",
          "Automate any desktop app or browser task with AI. No scripting knowledge required.",
          "/solutions#desktop-automation",
          "01",
        ],
        [
          "Robotics Integration",
          "ROS 2-based autonomous systems for navigation, manipulation, and sensing.",
          "/solutions#robotics",
          "02",
        ],
        [
          "Zalo AI Agents",
          "Intelligent Zalo chatbots and AI agents for Vietnamese business workflows.",
          "/solutions#zalo-agents",
          "03",
        ],
        [
          "AI Agents",
          "Multi-step task planning and execution agents for complex real-world problems.",
          "/research/ai-agents",
          "04",
        ],
        [
          "Computer Vision",
          "Practical object detection, quality inspection, and scene understanding systems.",
          "/research/computer-vision",
          "05",
        ],
        [
          "Rapid Prototyping",
          "From idea to working prototype fast — 3D printing, embedded systems, and more.",
          "/products/printing-3d-models",
          "06",
        ],
      ]
  return (
    <>
      <section className="hero">
        <div className="hero-grid container">
          <div className="hero-copy">
            <span className="eyebrow">Applied Robotics Lab</span>
            <Heading level={1}>{homePage?.[`hero_title_${lang}`] || t.home.title}</Heading>
            <p>{homePage?.[`hero_text_${lang}`] || t.home.intro}</p>
            <div className="button-row">
              <Link className="btn" href="/products">
                {t.nav.explore} <Arrow />
              </Link>
              <Link className="btn btn-ghost" href="/contact?type=request-demo">
                {t.nav.demo}
              </Link>
            </div>
            <div className="hero-stats">
              <div>
                <strong>3+</strong>
                <span>{t.nav.products}</span>
              </div>
              <div>
                <strong>Beta</strong>
                <span>Workflow Agent</span>
              </div>
              <div>
                <strong>ROS 2</strong>
                <span>
                  {lang === "vi" ? "Nền tảng Robot" : "Robot Platform"}
                </span>
              </div>
            </div>
          </div>
          <TaskRunner lang={lang} />
        </div>
      </section>
      <section className="section" id="products">
        <div className="container">
          <SectionHead
            eyebrow={t.home.productsEyebrow}
            title={t.home.productsTitle}
            text={t.home.productsIntro}
          />
          <div className="product-feature-grid">
            {ps.map((p, i) => (
              <ProductCard key={p.slug} p={p} lang={lang} featured index={i} />
            ))}
          </div>
          <div className="center">
            <Link className="text-link" href="/products">
              {lang === "vi" ? "Xem tất cả Sản phẩm" : "View All Products"}{" "}
              <Arrow />
            </Link>
          </div>
        </div>
      </section>
      <section className="section section-blue" id="capabilities">
        <div className="container">
          <SectionHead
            eyebrow={t.home.capabilities}
            title={t.home.capabilitiesTitle}
            text={t.home.capabilitiesIntro}
          />
          <div className="capability-grid">
            {capabilities.map(([title, desc, href, n]) => (
              <Link className="cap-card" href={href} key={title}>
                <span>{n}</span>
                <Heading level={3}>{title}</Heading>
                <p>{desc}</p>
                <b>
                  {t.common.learn} <Arrow />
                </b>
              </Link>
            ))}
          </div>
          <div className="slider-controls">
            <Button aria-label="Previous slide">←</Button>
            <Button aria-label="Next slide">→</Button>
          </div>
        </div>
      </section>
      <section className="section" id="research">
        <div className="container">
          <SectionHead
            eyebrow={t.nav.research}
            title={t.home.researchTitle}
            text={t.home.researchIntro}
            action={
              <Link className="text-link" href="/research">
                {t.home.exploreResearch} <Arrow />
              </Link>
            }
          />
          <ResearchCards lang={lang} featured />
        </div>
      </section>
      <section className="section contact-band" id="contact">
        <div className="container">
          <div className="contact-heading">
            <span className="eyebrow">{t.common.start}</span>
            <Heading level={2}>{t.home.ready}</Heading>
            <p>{t.home.readyText}</p>
          </div>
          <div className="contact-options">
            {(lang === "vi"
              ? [
                [
                  "Đặt lịch Demo",
                  "Xem Workflow Agent hoặc robot của chúng tôi hoạt động thực tế.",
                  "Lên lịch Demo",
                  "/contact?type=request-demo",
                ],
                [
                  "Hợp tác Nghiên cứu",
                  "Hợp tác với ARL trong các dự án nghiên cứu chung.",
                  "Hợp tác",
                  "/contact?type=research-collaboration",
                ],
                [
                  "Tự động hóa Doanh nghiệp",
                  "Tự động hóa quy trình làm việc tùy chỉnh cho doanh nghiệp của bạn.",
                  "Liên hệ",
                  "/contact?type=enterprise-workflow",
                ],
              ]
              : [
                [
                  "Request a Demo",
                  "See Workflow Agent or our robots in action.",
                  "Schedule Demo",
                  "/contact?type=request-demo",
                ],
                [
                  "Research Collaboration",
                  "Partner with ARL on joint research projects.",
                  "Collaborate",
                  "/contact?type=research-collaboration",
                ],
                [
                  "Enterprise Automation",
                  "Custom workflow automation for your business.",
                  "Get in Touch",
                  "/contact?type=enterprise-workflow",
                ],
              ]
            ).map(([title, desc, label, href], i) => (
              <div className="contact-option" key={title}>
                <span>0{i + 1}</span>
                <Heading level={3}>{title}</Heading>
                <p>{desc}</p>
                <Link href={href}>
                  {label} <Arrow />
                </Link>
              </div>
            ))}
          </div>
          <p className="center subtle">
            {t.home.different} · <Link href="/contact">{t.home.message}</Link>
          </p>
        </div>
      </section>
    </>
  )
}

function TaskRunner({ lang }: { lang: Lang }) {
  const vi = lang === "vi"
  return (
    <div className="task-window">
      <div className="window-bar">
        <div>
          <i />
          <i />
          <i />
        </div>
        <span>workflow-agent • task runner</span>
        <b>▶</b>
      </div>
      <div className="task-body">
        <small>{vi ? "Nhiệm vụ:" : "Task:"}</small>
        <Heading level={3}>
          {vi
            ? "Thu thập giá đối thủ từ 5 trang web"
            : "Collect competitor pricing from 5 websites"}
        </Heading>
        <div className="task-line done">
          <span>✓</span>
          {vi ? "Đang mở trình duyệt..." : "Opening browser..."}
        </div>
        <div className="task-line done">
          <span>✓</span>
          {vi
            ? "Đang điều hướng đến trang 1/5..."
            : "Navigating to site 1/5..."}
        </div>
        <div className="task-line done">
          <span>✓</span>
          {vi ? "Đang trích xuất bảng giá..." : "Extracting pricing table..."}
        </div>
        <div className="task-line active">
          <span>◉</span>
          {vi ? "Đang xử lý trang 3/5..." : "Processing site 3/5..."}
        </div>
        <div className="task-save">
          <span>⚡</span>
          <div>
            {vi ? "Đang lưu vào" : "Saving to"}
            <strong>pricing-report.xlsx</strong>
          </div>
        </div>
        <div className="progress">
          <div>
            <i />
          </div>
          <span>
            {vi ? "Tiến độ" : "Progress"}{" "}
            <b>{vi ? "3/5 trang" : "3/5 sites"}</b>
          </span>
        </div>
        <div className="task-tags">
          <span>{vi ? "Chạy cục bộ" : "Running locally"}</span>
          <span>{vi ? "Hỗ trợ AI" : "AI-powered"}</span>
        </div>
      </div>
    </div>
  )
}

type Product = typeof products["vi"][number] | typeof products["en"][number] | NonNullable<ReturnType<typeof productsFor>>[number]
function ProductCard({
  p,
  lang,
  featured = false,
  index = 0,
}: {
  p: Product
  lang: Lang
  featured?: boolean
  index?: number
}) {
  const c = copy[lang].common
  const primary = "ctaLabel" in p && p.ctaLabel ? p.ctaLabel : featured
    ? p.slug === "workflow-agent"
      ? lang === "vi"
        ? "Đăng ký Truy cập Sớm"
        : "Request Early Access"
      : p.slug === "printing-3d-models"
        ? lang === "vi"
          ? "Yêu cầu Báo giá"
          : "Request a Quote"
        : lang === "vi"
          ? "Hợp tác Nghiên cứu"
          : "Research Partnership"
    : c.access
  return (
    <article className={`product-card product-${index + 1}`}>
      <div className="product-media">
        {"image" in p && p.image ? <img src={p.image} alt={"imageAlt" in p && p.imageAlt ? p.imageAlt : p.title} style={{ width: "100%", height: 260, objectFit: "cover", borderRadius: 17 }} /> : <MediaPlaceholder label={`${p.title} preview`} kind={p.slug} />}
        <span className="status">{p.status}</span>
      </div>
      <div className="product-content">
        <div className="tag-row">
          {p.labels.map((x) => (
            <span key={x}>{x}</span>
          ))}
        </div>
        <Heading level={3}>
          <Link href={`/products/${p.slug}`}>{p.title}</Link>
        </Heading>
        <p>{p.desc}</p>
        {!featured && (
          <ul>
            {p.uses.map((u) => (
              <li key={u}>› {u}</li>
            ))}
          </ul>
        )}
        <div className="platform-row">
          {p.platforms.map((x) => (
            <span key={x}>{x}</span>
          ))}
        </div>
        <div className="card-actions">
          <Link href={`/products/${p.slug}`}>
            {featured ? c.learn : c.details} <Arrow />
          </Link>
          <Link className="card-primary" href={p.contact}>
            {primary}
          </Link>
        </div>
      </div>
    </article>
  )
}

function ProductsPage({ lang }: { lang: Lang }) {
  const cms = useCms()
  const page = pageByKey(cms, "products")
  const [filter, setFilter] = useState(() => new URLSearchParams(cmsSearch()).get("category") || "all")
  const t = copy[lang],
    ps = productsFor(cms, lang) || products[lang]
  const filters = cms ? [["all", lang === "vi" ? "Tất cả Sản phẩm" : "All Products"], ...[...new Map((cms.Taxonomies || []).filter(x => x.group === "product-category" && x.is_active !== false && ps.some(p => p.categories.includes(x.slug))).map(x => [x.slug, [x.slug, x[`label_${lang}`]]])).values()]] :
    lang === "vi"
      ? [
        ["all", "Tất cả Sản phẩm"],
        ["ai-automation", "Tự động hóa AI"],
        ["robotics", "Robot học"],
        ["3d-printing", "In 3D"],
        ["research-prototype", "Mẫu thử Nghiên cứu"],
      ]
      : [
        ["all", "All Products"],
        ["ai-automation", "AI Automation"],
        ["robotics", "Robotics"],
        ["3d-printing", "3D Printing"],
        ["research-prototype", "Research Prototype"],
      ]
  const shown =
    filter === "all" ? ps : ps.filter((p) => p.categories.includes(filter))
  return (
    <>
      <div className="container">
        <Breadcrumbs lang={lang} current={t.nav.products} />
      </div>
      <PageIntro
        eyebrow={t.nav.allProducts}
        title={page?.[`hero_title_${lang}`] || (
          lang === "vi"
            ? "Công cụ giúp hoàn thành công việc"
            : "Tools that get things done")
        }
        text={page?.[`hero_text_${lang}`] || (
          lang === "vi"
            ? "Từ tự động hóa desktop bằng AI đến robot tự hành — hệ thống thực tế cho cá nhân, đội ngũ và nhà nghiên cứu."
            : "From AI-powered desktop automation to autonomous robots — practical systems for individuals, teams, and researchers.")}
      />
      <section className="section section-tight">
        <div className="container">
          <div className="filter-row">
            {filters.map(([value, label]) => (
              <Button
                key={value}
                aria-pressed={filter === value}
                onClick={() => { setFilter(value); const url = new URL(window.location.href); value === "all" ? url.searchParams.delete("category") : url.searchParams.set("category", value); history.replaceState({}, "", url) }}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="products-grid" id="products-grid">
            {shown.map((p, i) => (
              <ProductCard key={p.slug} p={p} lang={lang} index={i} />
            ))}
          </div>
          {!shown.length && (
            <p id="empty-state">
              {lang === "vi"
                ? "Chưa có sản phẩm nào trong danh mục này."
                : "No products in this category yet."}
            </p>
          )}
        </div>
      </section>
    </>
  )
}

const details = {
  "workflow-agent": {
    vi: {
      features: [
        [
          "Quy trình Tự nhiên",
          "Mô tả tác vụ bằng ngôn ngữ tự nhiên. Agent sẽ tự lập kế hoạch và thực thi.",
        ],
        [
          "Thư viện Quy trình",
          "Lưu, tổ chức và sử dụng lại các quy trình tự động hóa của bạn.",
        ],
        [
          "Điều khiển Desktop & Web",
          "Tự động hóa mọi ứng dụng desktop hoặc tương tác trình duyệt.",
        ],
        [
          "Cục bộ & Riêng tư",
          "Chạy hoàn toàn trên máy của bạn. Dữ liệu của bạn thuộc về bạn.",
        ],
        [
          "Mô hình AI quản lý",
          "Được cung cấp bởi các mô hình AI tối ưu hóa cho thực thi tác vụ.",
        ],
        [
          "Hỗ trợ Windows & macOS",
          "Hỗ trợ đầy đủ cho Windows 10/11 và macOS 13+.",
        ],
      ],
      uses: [
        "Xử lý tài liệu văn phòng",
        "Nghiên cứu trình duyệt & thu thập dữ liệu",
        "Sắp xếp tệp & xử lý hàng loạt",
        "Tự động hóa email và lịch làm việc",
        "Quy trình kiểm thử phần mềm",
      ],
      specLabel: "Tác vụ Cục bộ / Local Execution",
      specTitle: "Mô phỏng Hoạt động",
      spec: [
        "workflow-agent --daemon",
        "// Khởi tạo tác nhân AI...",
        "$ arl-agent start",
        "✓ Tải thành công mô hình cục bộ (8B Q4)",
        "> Lập kế hoạch: Tự động điền dữ liệu hóa đơn vào Excel...",
        "1. Đọc tệp PDF trong thư mục Downloads",
        "2. Trích xuất thông tin: mã số thuế, tổng tiền",
        "3. Ghi dữ liệu vào file invoices.xlsx",
        "✓ Đang thực thi... Hoàn thành tác vụ!",
        "// Quy trình chạy an toàn 100% trên thiết bị của bạn.",
      ],
      processLabel: "Quy trình / Steps",
      processTitle: "Cách thức Hoạt động",
      process: [
        [
          "Mô tả tác vụ của bạn",
          "Nhập hoặc nói những gì bạn muốn làm bằng ngôn ngữ tự nhiên (tiếng Anh hoặc tiếng Việt). Không cần kỹ năng lập trình.",
        ],
        [
          "Tác nhân tự lập kế hoạch",
          "Mô hình AI cục bộ sẽ phân tích yêu cầu, tự động chia nhỏ công việc thành các bước cụ thể để thực hiện trên trình duyệt hoặc màn hình.",
        ],
        [
          "Theo dõi quá trình thực thi",
          "Xem trực tiếp tác nhân di chuyển chuột, nhập văn bản, mở ứng dụng và xử lý tệp tin trực tiếp trên màn hình của bạn.",
        ],
        [
          "Lưu lại để tái sử dụng",
          "Sau khi tác vụ chạy thành công, lưu quy trình vào thư viện cá nhân để kích hoạt lại bất kỳ lúc nào bằng phím tắt hoặc lịch hẹn sẵn.",
        ],
      ],
      ready: "Tham gia chương trình beta để có quyền truy cập sớm.",
      secondary: "Xem Demo",
    },
    en: {
      features: [
        [
          "Natural Language Workflows",
          "Describe tasks in plain language. The agent plans and executes multi-step automations automatically.",
        ],
        [
          "Workflow Library",
          "Save, organize, and reuse your automations. Share workflows with your team or publish to the community.",
        ],
        [
          "Desktop & Web Control",
          "Automate any desktop app or browser interaction — clicks, typing, form fills, data extraction.",
        ],
        [
          "Local & Private",
          "Runs entirely on your machine. Your data stays yours — no cloud required for core automation.",
        ],
        [
          "Managed AI Models",
          "Powered by curated AI models optimized for task execution. Switch models as needed.",
        ],
        [
          "Windows & macOS Support",
          "Full support for Windows 10/11 and macOS 13+. Linux support coming soon.",
        ],
      ],
      uses: [
        "Office document processing",
        "Browser research & data collection",
        "File organization & batch operations",
        "Email and calendar automation",
        "Software testing workflows",
      ],
      specLabel: "Tác vụ Cục bộ / Local Execution",
      specTitle: "Activity Simulation",
      spec: [
        "workflow-agent --daemon",
        "// Initializing AI agent...",
        "$ arl-agent start",
        "✓ Local model loaded successfully (8B Q4)",
        "> Planning: Auto fill invoice details to Excel...",
        "1. Read PDF files from Downloads folder",
        "2. Extract values: Tax ID, total amount",
        "3. Write variables to invoices.xlsx file",
        "✓ Executing... Task complete!",
        "// Automation processes run 100% locally on your machine.",
      ],
      processLabel: "Quy trình / Steps",
      processTitle: "How It Works",
      process: [
        [
          "Describe your task",
          "Type or speak your goals in natural language (English or Vietnamese). No programming skills required.",
        ],
        [
          "Agent plans automatically",
          "The local AI model analyzes the request, then builds a plan of steps to execute across the browser or local desktop apps.",
        ],
        [
          "Watch execution live",
          "See the agent interact with your computer live — moving cursors, typing text, launching programs, and editing files in real time.",
        ],
        [
          "Save for reuse",
          "Save successfully executed tasks in your personal dashboard library to trigger them instantly with shortcuts or set timer schedules.",
        ],
      ],
      ready: "Join the beta program to get early access.",
      secondary: "Watch Demo",
    },
  },
  "printing-3d-models": {
    vi: {
      features: [
        [
          "In FDM & Resin",
          "FDM đa vật liệu cho mẫu thử chức năng. Resin độ chi tiết cao cho linh kiện chính xác.",
        ],
        [
          "Vật liệu kỹ thuật",
          "PLA, PETG, ABS, TPU và các loại sợi đặc biệt. Hướng dẫn vật liệu kèm theo.",
        ],
        [
          "Tối ưu cho Robot",
          "Bản thiết kế được kiểm tra bởi kỹ sư robot để đảm bảo độ khít cơ học.",
        ],
        [
          "Hoàn thành nhanh",
          "In tiêu chuẩn sẵn sàng sau 24-72 giờ. Dịch vụ in nhanh có sẵn.",
        ],
        ["Hỗ trợ định dạng", "Chấp nhận các định dạng STL, STEP, 3MF và OBJ."],
        [
          "Hậu xử lý",
          "Chà nhám, sơn, làm ren và hỗ trợ lắp ráp dưới dạng dịch vụ bổ sung.",
        ],
      ],
      uses: [
        "Tạo mẫu thử linh kiện robot",
        "Vỏ bọc và giá đỡ tùy chỉnh",
        "Đồ gá và đồ định vị nghiên cứu",
        "Mô hình khái niệm sản phẩm",
        "Linh kiện cơ học thay thế",
      ],
      specLabel: "Vật liệu / Materials",
      specTitle: "Vật liệu kỹ thuật",
      materials: [
        [
          "PLA / PETG",
          "Mẫu thử chức năng",
          "Độ bền cơ học cao, chịu lực kéo tốt. Thích hợp cho linh kiện robot, đồ gá và vỏ bọc.",
        ],
        [
          "ABS / TPU (Dẻo)",
          "Chịu lực & Dẻo",
          "Chịu nhiệt tốt, đàn hồi cao. Thích hợp cho các linh kiện giảm chấn, lốp xe robot và khớp nối dẻo.",
        ],
        [
          "Resin (Độ phân giải)",
          "Độ chính xác cao",
          "Bề mặt mịn màng, độ chi tiết siêu cao. Lý tưởng cho bánh răng nhỏ, ren cơ khí và linh kiện siêu nhỏ.",
        ],
      ],
      processLabel: "Quy trình / Process",
      processTitle: "Quy trình sản xuất",
      process: [
        [
          "Tải lên tệp thiết kế 3D",
          "Gửi tệp thiết kế của bạn định dạng STL, STEP, 3MF hoặc OBJ qua biểu mẫu liên hệ hoặc email trực tiếp.",
        ],
        [
          "Nhận báo giá trong 4 giờ",
          "Đội ngũ kỹ sư của ARL sẽ kiểm tra cơ tính tệp tin và phản hồi với báo giá chi tiết cùng tư vấn vật liệu tối ưu.",
        ],
        [
          "In 3D tốc độ cao",
          "Sản phẩm được in trên các dòng máy in 3D công nghiệp hiện đại, đảm bảo độ bám lớp vững chắc và độ dung sai cơ khí nhỏ.",
        ],
        [
          "Bàn giao & Hậu xử lý",
          "Xử lý chà nhám, tạo ren kim loại (thread inserts), lắp ráp linh kiện và bàn giao trong 24–72 giờ.",
        ],
      ],
      ready: "Liên hệ với chúng tôi để tìm hiểu thêm hoặc yêu cầu bản demo.",
      secondary: "Xem Ví dụ",
    },
    en: {
      features: [
        [
          "FDM & Resin Printing",
          "Multi-material FDM for functional prototypes. High-detail resin for precise components.",
        ],
        [
          "Engineering Materials",
          "PLA, PETG, ABS, TPU, and specialty filaments. Material guidance included.",
        ],
        [
          "Robotics Optimized",
          "Designs reviewed by robotics engineers to ensure printability and mechanical fit.",
        ],
        [
          "Fast Turnaround",
          "Standard prints ready in 24–72 hours. Rush service available for urgent projects.",
        ],
        [
          "File Support",
          "Accepts STL, STEP, 3MF, and OBJ formats. Design review available on request.",
        ],
        [
          "Post-Processing",
          "Sanding, painting, threading, and assembly support available as add-ons.",
        ],
      ],
      uses: [
        "Robotics part prototyping",
        "Custom enclosures and mounts",
        "Research fixtures and jigs",
        "Product concept models",
        "Replacement mechanical parts",
      ],
      specLabel: "Vật liệu / Materials",
      specTitle: "Engineering Materials",
      materials: [
        [
          "PLA / PETG",
          "Functional Prototypes",
          "High mechanical strength, solid tensile properties. Suitable for robotic parts, fixtures, and mounts.",
        ],
        [
          "ABS / TPU (Flexible)",
          "Tough & Flexible",
          "Excellent heat resistance and elasticity. Suitable for shock absorbers, tires, and flexible hinges.",
        ],
        [
          "Resin (Detail)",
          "Ultra Precision",
          "Very smooth surfaces and high details. Ideal for small gears, mechanical threads, and micro components.",
        ],
      ],
      processLabel: "Quy trình / Process",
      processTitle: "Production Process",
      process: [
        [
          "Upload 3D files",
          "Submit files in STL, STEP, 3MF, or OBJ format using our contact form or by emailing us directly.",
        ],
        [
          "Get quote in 4 hours",
          "ARL engineers will evaluate files for structure and return a detailed quote with material selection tips.",
        ],
        [
          "High-speed 3D printing",
          "Parts are printed on industrial machinery, ensuring clean layers and structural density within tight tolerances.",
        ],
        [
          "Finishing & Delivery",
          "Post-processing options include sanding, painting, thread insertion, assembly, and shipping in 24–72 hours.",
        ],
      ],
      ready: "Contact us to learn more or request a demo.",
      secondary: "View Examples",
    },
  },
  "autonomous-robot-vehicle": {
    vi: {
      features: [
        [
          "Hợp nhất Cảm biến",
          "Hợp nhất LiDAR, camera, IMU và siêu âm để nhận thức môi trường mạnh mẽ.",
        ],
        [
          "Kiến trúc Modular",
          "Thay đổi cảm biến, máy tính nhúng và cơ cấu chấp hành để phù hợp nghiên cứu.",
        ],
        [
          "Tương thích ROS 2",
          "Xây dựng trên ROS 2 để tích hợp liền mạch với hệ sinh thái nghiên cứu robot.",
        ],
        [
          "Điều hướng Thời gian thực",
          "Lập bản đồ dựa trên SLAM và lập lộ trình tránh chướng ngại vật lên tới 1.5 m/s.",
        ],
        [
          "Nền tảng Nghiên cứu Mở",
          "SDK đầy đủ và tài liệu chi tiết cho đối tác nghiên cứu và trường đại học.",
        ],
        [
          "Giám sát Từ xa",
          "Bảng điều khiển web cho dữ liệu từ xa, kiểm soát nhiệm vụ và ghi nhật ký.",
        ],
      ],
      uses: [
        "Nghiên cứu điều hướng tự hành",
        "Thử nghiệm thuật toán thị giác máy tính",
        "Thử nghiệm phối hợp đa robot",
        "Lập bản đồ và khám phá trong nhà",
        "Nghiên cứu tương tác người - robot",
      ],
      specLabel: "Thông số / Specifications",
      specTitle: "Thông số kỹ thuật",
      specs: [
        ["Vi xử lý / Compute", "NVIDIA Jetson Orin"],
        ["Hệ điều hành / OS", "Ubuntu 22.04 + ROS 2"],
        ["Cảm biến / Sensors", "LiDAR 2D + RGB-D"],
        ["Tốc độ / Speed", "Max 1.5 m/s"],
        ["Thời gian chạy / Battery", "~4 giờ / hours"],
      ],
      processLabel: "Nghiên cứu / Research",
      processTitle: "Ứng dụng Nghiên cứu",
      process: [
        [
          "Điều hướng tự hành (SLAM)",
          "Thử nghiệm các thuật toán lập bản đồ 2D/3D trực tiếp, tối ưu hóa công nghệ tránh chướng ngại vật động và định tuyến thông minh.",
        ],
        [
          "Thị giác máy tính nâng cao",
          "Ứng dụng AI để phân tích camera RGB-D, nhận diện và phân loại vật thể chuyển động thời gian thực trên bo mạch NVIDIA Jetson.",
        ],
        [
          "Phối hợp đội hình (Swarm Robotics)",
          "Nghiên cứu điều khiển đa tác nhân, phối hợp nhiều robot tự hành phân chia vùng khám phá thông qua kết nối Wi-Fi ROS 2 DDS.",
        ],
        [
          "Liên hệ hợp tác nghiên cứu",
          "Robot ARV hiện được cung cấp dưới dạng nền tảng hợp tác nghiên cứu. Hãy liên hệ với chúng tôi để thiết lập kết nối thử nghiệm.",
        ],
      ],
      ready: "Có sẵn cho các đối tác nghiên cứu và trường đại học.",
      secondary: "Xem Demo",
    },
    en: {
      features: [
        [
          "Sensor Fusion",
          "LiDAR, camera, IMU, and ultrasonic fusion for robust environment perception.",
        ],
        [
          "Modular Architecture",
          "Swap sensors, compute modules, and actuators to suit your research needs.",
        ],
        [
          "ROS 2 Native",
          "Built on ROS 2 for seamless integration with the robotics research ecosystem.",
        ],
        [
          "Real-time Navigation",
          "SLAM-based mapping and path planning with obstacle avoidance at up to 1.5 m/s.",
        ],
        [
          "Open Research Platform",
          "Full SDK and documentation available to research partners and universities.",
        ],
        [
          "Remote Monitoring",
          "Web dashboard for telemetry, mission control, and data logging.",
        ],
      ],
      uses: [
        "Autonomous navigation research",
        "Computer vision algorithm testing",
        "Multi-robot coordination experiments",
        "Indoor mapping and exploration",
        "Human-robot interaction studies",
      ],
      specLabel: "Thông số / Specifications",
      specTitle: "Technical Specifications",
      specs: [
        ["Compute", "NVIDIA Jetson Orin"],
        ["OS", "Ubuntu 22.04 + ROS 2"],
        ["Sensors", "2D LiDAR + RGB-D"],
        ["Speed", "Max 1.5 m/s"],
        ["Battery", "~4 hours"],
      ],
      processLabel: "Nghiên cứu / Research",
      processTitle: "Research Applications",
      process: [
        [
          "Autonomous Navigation (SLAM)",
          "Test real-time 2D/3D map generation, optimize dynamic obstacle avoidance, and build intelligent trajectory routing.",
        ],
        [
          "Advanced Computer Vision",
          "Run real-time neural network detection, segmentation, and classification utilizing RGB-D cameras directly on Orin hardware.",
        ],
        [
          "Swarm Robotics Coordination",
          "Conduct multi-agent control research with multiple robot vehicles mapping regions collaboratively via ROS 2 DDS.",
        ],
        [
          "Research Collaboration Program",
          "The ARV is provided to institutional and academic partners under our collaboration program. Contact us to establish access.",
        ],
      ],
      ready: "Available to research partners and universities.",
      secondary: "Watch Demo",
    },
  },
} as const

function ProductDetail({
  lang,
  slug,
}: {
  lang: Lang
  slug: keyof typeof details
}) {
  const p = products[lang].find((x) => x.slug === slug)!
  const d = details[slug][lang] as any,
    c = copy[lang].common
  const secondaryHref =
    slug === "printing-3d-models"
      ? p.contact
      : `/contact?product=${slug}&type=product-demo`
  return (
    <>
      <div className="container">
        <Breadcrumbs lang={lang} current={p.title} parent={c.products} />
      </div>
      <section className="product-hero">
        <div className="container product-hero-grid">
          <div>
            <div className="tag-row">
              {p.labels.map((x) => (
                <span key={x}>{x}</span>
              ))}
            </div>
            <span className="status inline">{p.status}</span>
            <Heading level={1}>{p.title}</Heading>
            <p>{p.desc}</p>
            <small>{c.availableOn}</small>
            <div className="platform-row">
              {p.platforms.map((x) => (
                <span key={x}>{x}</span>
              ))}
            </div>
            <div className="button-row">
              <Link className="btn" href={p.contact}>
                {c.access} <Arrow />
              </Link>
              <Link className="btn btn-ghost" href={secondaryHref}>
                {d.secondary}
              </Link>
            </div>
          </div>
          <MediaPlaceholder label={p.title} kind={slug} />
        </div>
      </section>
      <section className="section" id="features">
        <div className="container">
          <SectionHead eyebrow={c.features} title={c.whatCanDo} />
          <div className="feature-grid">
            {d.features.map((x: string[], i: number) => (
              <div className="feature-card" key={x[0]}>
                <span>0{i + 1}</span>
                <Heading level={3}>{x[0]}</Heading>
                <p>{x[1]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section section-ivory" id="use-cases">
        <div className="container two-col">
          <SectionHead eyebrow={c.workflows} title={c.builtFor} />
          <ul className="use-list">
            {d.uses.map((x: string) => (
              <li key={x}>
                <span>✓</span>
                {x}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="section" id="specifications">
        <div className="container">
          <SectionHead eyebrow={d.specLabel} title={d.specTitle} />
          {d.spec && <pre className="terminal">{d.spec.join("\n")}</pre>}
          {d.materials && (
            <div className="material-grid">
              {d.materials.map((x: string[]) => (
                <div key={x[0]}>
                  <Heading level={3}>{x[0]}</Heading>
                  <strong>{x[1]}</strong>
                  <p>{x[2]}</p>
                </div>
              ))}
            </div>
          )}
          {d.specs && (
            <div className="spec-list">
              {d.specs.map((x: string[]) => (
                <div key={x[0]}>
                  <span>{x[0]}</span>
                  <strong>{x[1]}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="section section-blue">
        <div className="container">
          <SectionHead eyebrow={d.processLabel} title={d.processTitle} />
          <div className="process-grid">
            {d.process.map((x: string[], i: number) => (
              <div key={x[0]}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <Heading level={3}>{x[0]}</Heading>
                <p>{x[1]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section" id="download">
        <div className="container final-cta">
          <span className="eyebrow">{c.start}</span>
          <Heading level={2}>{c.ready}</Heading>
          <p>{d.ready}</p>
          <div className="button-row">
            <Link className="btn" href={p.contact}>
              {c.access}
            </Link>
            <Link className="btn btn-ghost" href={secondaryHref}>
              {d.secondary}
            </Link>
          </div>
          <p>
            {lang === "vi"
              ? `Có câu hỏi về sản phẩm? ${slug === "printing-3d-models"
                ? "3D Printing Solutions"
                : p.title
              }?`
              : `Have questions about this product? ${p.title}?`}{" "}
            <Link href={`/contact?product=${slug}`}>{c.contactUs}</Link>
          </p>
        </div>
      </section>
    </>
  )
}

function CmsProductDetail({ lang, item }: { lang: Lang; item: Record<string, any> }) {
  const cms = useCms()
  const p = productsFor(cms, lang)?.find(x => x.id === item.product_id)
  if (!p) return <NotFound lang={lang} />
  const videoMedia = cms?.Media?.find(x => x.media_id === item.video_media_id && x.mime_type === "video/mp4")
  const videoUrl = videoMedia ? assetUrl(cms, item.video_media_id) : null
  const blocks = (cms?.Content_Blocks || []).filter(x => x.owner_type === "product" && x.owner_id === item.product_id && x.is_active !== false).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  const sections = [...new Set(blocks.map(x => x.section_key))]
  const sectionLabel: Record<string, [string, string]> = { features: ["Tính năng", "Features"], uses: ["Ứng dụng", "Use cases"], process: ["Quy trình", "Process"], materials: ["Vật liệu", "Materials"], specs: ["Thông số", "Specifications"], simulation: ["Mô phỏng", "Simulation"] }
  return <>
    <div className="container"><Breadcrumbs lang={lang} current={p.title} parent={copy[lang].common.products} /></div>
    <section className="product-hero"><div className="container two-col">
      <div><span className="eyebrow">{copy[lang].common.products}</span><span className="status inline">{p.status}</span><h1>{p.title}</h1><p>{p.desc}</p><div className="button-row"><Link className="btn" href={p.contact}>{p.ctaLabel} <Arrow /></Link><Link className="btn btn-ghost" href="/products">{lang === "vi" ? "Xem sản phẩm khác" : "Other products"}</Link></div></div>
      {p.image ? <img src={p.image} alt={p.imageAlt} style={{ width: "100%", maxHeight: 450, objectFit: "cover", borderRadius: 24 }} /> : <MediaPlaceholder label={p.title} kind={p.slug} />}
    </div></section>
    {videoUrl && <section className="section section-tight"><div className="container"><SectionHead eyebrow={p.title} title={lang === "vi" ? "Video giới thiệu" : "Product video"} /><video controls playsInline preload="metadata" poster={p.image || undefined} aria-label={videoMedia?.[`alt_${lang}`] || p.title} style={{ width: "100%", maxWidth: 960, borderRadius: 20, background: "#0a111d" }}><source src={videoUrl} type="video/mp4" />{lang === "vi" ? "Trình duyệt của bạn không hỗ trợ video này." : "Your browser does not support this video."}</video></div></section>}
    {sections.map(section => <section className="section" key={section}><div className="container"><SectionHead eyebrow={p.title} title={sectionLabel[section]?.[lang === "vi" ? 0 : 1] || section} />{section === "simulation" ? <pre className="cms-simulation">{blocks.filter(x => x.section_key === section).map(x => x[`text_${lang}`]).join("\n")}</pre> : <div className="feature-grid">{blocks.filter(x => x.section_key === section).map(block => <article className="feature-card" key={block.block_id}><h3>{block[`title_${lang}`]}</h3>{block[`text_${lang}`] && <p>{block[`text_${lang}`]}</p>}{block.value && <strong>{block.value} {block.unit}</strong>}</article>)}</div>}</div></section>)}
  </>
}

function CmsResearchDetail({ lang, item }: { lang: Lang; item: Record<string, any> }) {
  const cms = useCms()
  const related = (cms?.Relations || []).filter(x => x.from_type === "research" && x.from_id === item.research_id && x.to_type === "product").map(x => cms?.Products?.find(p => p.product_id === x.to_id)).filter((x): x is Record<string, any> => Boolean(x))
  const body = String(item[`body_${lang}`] || "")
  return <>
    <div className="container"><Breadcrumbs lang={lang} current={item[`title_${lang}`]} parent={copy[lang].common.research} /></div>
    <article className="article"><div className="container"><header className="article-header"><span className="eyebrow">{item.research_type}</span><h1>{item[`title_${lang}`]}</h1><p>{item[`summary_${lang}`]}</p></header>
      {body && <div className="article-body"><CmsMarkdown body={body} content={cms} /></div>}
      {related.length > 0 && <section className="section-tight"><h2>{lang === "vi" ? "Sản phẩm liên quan" : "Related products"}</h2>{related.map(p => <p key={p.product_id}><Link className="text-link" href={`/products/${p.slug}`}>{p[`name_${lang}`]} <Arrow /></Link></p>)}</section>}
      <div className="button-row"><Link className="btn" href="/contact?type=research-collaboration">{copy[lang].common.collab} <Arrow /></Link></div>
    </div></article>
  </>
}

function Solutions({ lang }: { lang: Lang }) {
  const cms = useCms()
  const vi = lang === "vi"
  const rows = cms?.Solutions?.length ? cms.Solutions.map(s => {
    const uses = (cms.Content_Blocks || []).filter(x => x.owner_type === "solution" && x.owner_id === s.solution_id && x.section_key === "use_cases" && x.is_active !== false).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(x => x[`title_${lang}`])
    const relatedId = (cms.Relations || []).find(x => x.from_type === "solution" && x.from_id === s.solution_id && x.to_type === "product")?.to_id
    const product = cms.Products?.find(x => x.product_id === relatedId)
    return [s.slug, s[`name_${lang}`], s[`tagline_${lang}`], s[`problem_${lang}`], s[`solution_${lang}`], s[`audience_${lang}`], uses, product ? `/products/${product.slug}` : ""]
  }) : vi
    ? [
      [
        "desktop-automation",
        "Quy trình Tự động hóa Desktop & Web",
        "Ngừng nhấp chuột, bắt đầu giao việc.",
        "Các tác vụ kỹ thuật số lặp đi lặp lại tiêu tốn hàng giờ mỗi tuần — sao chép dữ liệu, điền biểu mẫu, xử lý tệp, trích xuất thông tin từ các trang web.",
        "Workflow Agent mang tự động hóa hỗ trợ AI đến màn hình máy tính của bạn — mô tả công việc, nó sẽ thực thi. Không cần script. Không cần plugin. Chỉ có kết quả.",
        "Doanh nghiệp nhỏ, đội ngũ văn phòng, nhân viên vận hành, người lao động tri thức.",
        [
          "Tự động nhập dữ liệu từ email vào bảng tính",
          "Nghiên cứu và thu thập dữ liệu trên trình duyệt",
          "Xử lý và sắp xếp tệp hàng loạt",
          "Điền biểu mẫu và tạo tài liệu",
          "Tổng hợp báo cáo theo lịch trình",
        ],
        "/products/workflow-agent",
      ],
      [
        "robotics",
        "Tự động hóa Robot",
        "Tự động hóa vật lý cho môi trường thực tế.",
        "Các quy trình thủ công trong kho bãi, phòng thí nghiệm và dây chuyền sản xuất diễn ra chậm, dễ xảy ra sai sót và tốn kém khi mở rộng quy mô.",
        "ARL thiết kế và xây dựng các hệ thống robot tự hành phù hợp với môi trường của bạn — sử dụng kiến trúc ROS 2 đã được chứng minh và phần cứng tùy chỉnh.",
        "Nhà sản xuất, tổ chức nghiên cứu, công ty hậu cần, trường đại học.",
        [
          "Điều hướng và lập bản đồ tự hành trong nhà",
          "Phát hiện và gắp vật thể",
          "Kiểm tra chất lượng bằng thị giác máy tính",
          "Triển khai nền tảng nghiên cứu",
          "Dự án tích hợp robot tùy chỉnh",
        ],
        "/products/autonomous-robot-vehicle",
      ],
      [
        "zalo-agents",
        "Tác nhân AI Zalo",
        "Chatbot Zalo hỗ trợ AI cho doanh nghiệp Việt.",
        "Doanh nghiệp dành lượng thời gian khổng lồ để trả lời các câu hỏi lặp đi lặp lại của khách hàng trên Zalo — nền tảng nhắn tin phổ biến nhất Việt Nam.",
        "ARL xây dựng các chatbot Zalo OA thông minh được hỗ trợ bởi AI — xử lý các câu hỏi thường gặp, trạng thái đơn hàng, đặt lịch hẹn và chuyển tiếp cho con người khi cần.",
        "Doanh nghiệp nhỏ Việt Nam, cửa hàng thương mại điện tử, công ty dịch vụ sử dụng Zalo để giao tiếp với khách hàng.",
        [
          "Câu hỏi thường gặp và hỗ trợ khách hàng tự động",
          "Tích hợp trạng thái và theo dõi đơn hàng",
          "Đặt lịch hẹn tự động",
          "Phân loại và định tuyến khách hàng tiềm năng",
          "Gợi ý sản phẩm thông minh",
        ],
        "",
      ],
    ]
    : [
      [
        "desktop-automation",
        "Desktop & Web Automation Workflows",
        "Stop clicking, start delegating.",
        "Repetitive digital tasks consume hours every week — copying data, filling forms, processing files, extracting information from websites.",
        "Workflow Agent brings AI-powered automation to your desktop — describe a task, it executes. No scripts. No plugins. Just results.",
        "SMBs, office teams, operations staff, individual knowledge workers.",
        [
          "Automated data entry from email to spreadsheets",
          "Browser-based research and data collection",
          "Batch file processing and organization",
          "Form filling and document generation",
          "Scheduled report compilation",
        ],
        "/products/workflow-agent",
      ],
      [
        "robotics",
        "Robotics Automation",
        "Physical automation for real environments.",
        "Manual processes in warehouses, labs, and manufacturing lines are slow, error-prone, and expensive to scale.",
        "ARL designs and builds autonomous robotic systems tailored to your environment — using proven ROS 2 architecture and custom hardware.",
        "Manufacturers, research institutions, logistics companies, universities.",
        [
          "Indoor autonomous navigation and mapping",
          "Object detection and picking",
          "Quality inspection with computer vision",
          "Research platform deployment",
          "Custom robotics integration projects",
        ],
        "/products/autonomous-robot-vehicle",
      ],
      [
        "zalo-agents",
        "Zalo AI Agents",
        "AI-powered Zalo chatbots for Vietnamese business.",
        "Businesses spend enormous time responding to repetitive customer inquiries on Zalo — Vietnam's most popular messaging platform.",
        "ARL builds intelligent Zalo OA chatbots powered by AI — handling FAQs, order status, appointment booking, and escalation to humans.",
        "Vietnamese SMBs, e-commerce stores, service companies using Zalo for customer communication.",
        [
          "Automated FAQ and customer support",
          "Order status and tracking integration",
          "Appointment scheduling",
          "Lead qualification and routing",
          "Product recommendation",
        ],
        "",
      ],
    ]
  return (
    <>
      <div className="container">
        <Breadcrumbs lang={lang} current={copy[lang].nav.solutions} />
      </div>
      <PageIntro
        eyebrow={copy[lang].nav.solutions}
        title={
          vi ? "Giải pháp quy mô cùng bạn" : "Solutions that scale with you"
        }
        text={
          vi
            ? "Cho dù bạn đang tự động hóa quy trình văn phòng, triển khai robot hay xây dựng tác nhân Zalo AI — chúng tôi đều có công nghệ và chuyên môn để đáp ứng."
            : "Whether you're automating office workflows, deploying robots, or building Zalo agents — we have the technology and expertise to deliver."
        }
      />
      <section className="section">
        <div className="container solution-stack">
          {rows.map((r, i) => (
            <article
              className="solution-row"
              id={r[0] as string}
              key={r[0] as string}
            >
              <div className="solution-number">0{i + 1}</div>
              <div className="solution-main">
                <Heading level={2}>{r[1] as string}</Heading>
                <strong>{r[2] as string}</strong>
                <div className="problem-grid">
                  <div>
                    <small>{vi ? "Vấn đề" : "The Problem"}</small>
                    <p>{r[3] as string}</p>
                  </div>
                  <div>
                    <small>{vi ? "Giải pháp ARL" : "The ARL Solution"}</small>
                    <p>{r[4] as string}</p>
                  </div>
                </div>
                <p>
                  <b>{vi ? "Đối tượng:" : "Audience:"}</b> {r[5] as string}
                </p>
                <div className="button-row">
                  <Link
                    className="btn"
                    href={`/contact?type=enterprise-workflow&solution=${r[0]}`}
                  >
                    {vi ? "Thảo luận Nhu cầu" : "Discuss Your Needs"}
                  </Link>
                  {r[7] && (
                    <Link className="btn btn-ghost" href={r[7] as string}>
                      {vi ? "Xem Sản phẩm" : "See Product"}
                    </Link>
                  )}
                </div>
              </div>
              <div className="use-box">
                <Heading level={3}>
                  {vi ? "Trường hợp sử dụng" : "Use Cases"}
                </Heading>
                <ul>
                  {(r[6] as string[]).map((x) => (
                    <li key={x}>✓ {x}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="section section-yellow">
        <div className="container final-cta">
          <Heading level={2}>
            {vi
              ? "Bạn chưa biết giải pháp nào phù hợp?"
              : "Not sure which solution fits?"}
          </Heading>
          <p>
            {vi
              ? "Hãy chia sẻ thách thức của bạn và chúng tôi sẽ đề xuất hướng tiếp cận phù hợp."
              : "Tell us about your challenge and we'll recommend the right approach."}
          </p>
          <Link className="btn" href="/contact">
            {vi ? "Liên hệ ARL" : "Contact ARL"}
          </Link>
        </div>
      </section>
    </>
  )
}

const researchItems = {
  vi: [
    [
      "research-area",
      "Tác nhân AI & Tự động hóa tác vụ",
      "Nghiên cứu các kiến trúc tác nhân AI mạnh mẽ có khả năng lập kế hoạch, thực thi và tự phục hồi từ các tác vụ đa bước trên máy tính, web và môi trường robot.",
      ["Tác nhân AI", "LLM", "Tự động hóa"],
      "/research/ai-agents",
    ],
    [
      "project",
      "Điều hướng Robot tự hành",
      "Nghiên cứu ứng dụng về nhận thức và điều hướng mạnh mẽ cho robot di động tự hành trong môi trường thực tế không cấu trúc.",
      ["Robot học", "Điều hướng", "SLAM"],
      "/research/autonomous-navigation",
    ],
    [
      "research-area",
      "Thị giác máy tính cho Robot",
      "Phát triển các hệ thống thị giác máy tính thực tế để phát hiện đối tượng, hiểu cảnh và tương tác giữa robot và môi trường trong môi trường sản xuất và phòng thí nghiệm thực tế.",
      ["Thị giác máy tính", "Phát hiện đối tượng", "Robot học"],
      "/research/computer-vision",
    ],
  ],
  en: [
    [
      "research-area",
      "AI Agents & Task Automation",
      "Researching robust AI agent architectures that can plan, execute, and recover from multi-step tasks in desktop, web, and robotic environments.",
      ["AI Agents", "LLM", "Automation"],
      "/research/ai-agents",
    ],
    [
      "project",
      "Autonomous Robot Navigation",
      "Applied research on robust perception and navigation for autonomous mobile robots in unstructured real-world environments.",
      ["Robotics", "Autonomous Navigation", "SLAM"],
      "/research/autonomous-navigation",
    ],
    [
      "research-area",
      "Computer Vision for Robotics",
      "Developing practical computer vision systems for object detection, scene understanding, and robot-environment interaction in real manufacturing and lab settings.",
      ["Computer Vision", "Object Detection", "Robotics"],
      "/research/computer-vision",
    ],
  ],
}
function ResearchCards({
  lang,
  featured = false,
  filter = "all",
}: {
  lang: Lang
  featured?: boolean
  filter?: string
}) {
  const cms = useCms()
  const records = researchFor(cms, lang) || researchItems[lang]
  const featuredRoutes = placedIds(cms, "home_research").map(id => cms?.Research?.find(x => x.research_id === id)?.slug).filter(Boolean).map(slug => `/research/${slug}`)
  const items = featured
    ? featuredRoutes.length ? records.filter(x => featuredRoutes.includes(x[4] as string)).sort((a, b) => featuredRoutes.indexOf(a[4] as string) - featuredRoutes.indexOf(b[4] as string)) : records.slice(0, 2)
    : records.filter((x) => filter === "all" || x[0] === filter)
  return (
    <div className="research-grid">
      {items.map((x, i) => (
        <article className="research-card" key={x[1] as string}>
          <div className={`research-visual visual-${i + 1}`}>
            <span>ARL / 0{i + 1}</span>
            <i />
            <i />
            <i />
          </div>
          <div>
            <span className="eyebrow">
              {({ project: ["Dự án", "Project"], "research-area": ["Lĩnh vực Nghiên cứu", "Research Area"], publication: ["Công bố", "Publication"], "technical-article": ["Bài viết", "Article"], "open-source": ["Mã nguồn mở", "Open Source"] } as Record<string, string[]>)[x[0] as string]?.[lang === "vi" ? 0 : 1] || x[0]}
            </span>
            <Heading level={3}>
              <Link href={x[4] as string}>{x[1] as string}</Link>
            </Heading>
            <p>{x[2] as string}</p>
            {!featured && <small>Applied Robotics Lab</small>}
            <div className="tag-row">
              {(x[3] as string[]).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
function Research({ lang }: { lang: Lang }) {
  const cms = useCms()
  const page = pageByKey(cms, "research")
  const [filter, setFilter] = useState(() => new URLSearchParams(cmsSearch()).get("type") || "all")
  const vi = lang === "vi"
  const filters = vi
    ? [
      ["all", "Tất cả"],
      ["research-area", "Lĩnh vực Nghiên cứu"],
      ["project", "Dự án"],
      ["publication", "Công bố"],
      ["technical-article", "Bài viết"],
      ["open-source", "Mã nguồn mở"],
    ]
    : [
      ["all", "All"],
      ["research-area", "Research Areas"],
      ["project", "Projects"],
      ["publication", "Publications"],
      ["technical-article", "Articles"],
      ["open-source", "Open Source"],
    ]
  return (
    <>
      <div className="container">
        <Breadcrumbs lang={lang} current={copy[lang].nav.research} />
      </div>
      <PageIntro
        eyebrow={copy[lang].nav.research}
        title={page?.[`hero_title_${lang}`] || (vi
            ? "Nghiên cứu ứng dụng, tác động thực tế"
            : "Applied research, real impact")}
        text={page?.[`hero_text_${lang}`] || (vi
            ? "Nghiên cứu của chúng tôi hỗ trợ trực tiếp cho các sản phẩm thực tế — từ kiến trúc tác nhân AI đến hệ thống điều hành tự hành trên phần cứng thực."
            : "Our research directly informs the products we build — from AI agent architectures to autonomous navigation systems deployed on real hardware.")}
      />
      <section className="section section-tight">
        <div className="container">
          <div className="filter-row">
            {filters.map(([v, l]) => (
              <Button
                key={v}
                aria-pressed={filter === v}
                onClick={() => { setFilter(v); const url = new URL(window.location.href); v === "all" ? url.searchParams.delete("type") : url.searchParams.set("type", v); history.replaceState({}, "", url) }}
              >
                {l}
              </Button>
            ))}
          </div>
          <ResearchCards lang={lang} filter={filter} />
          {filter !== "all" && !(researchFor(cms, lang) || researchItems[lang]).some(x => x[0] === filter) && <p>{vi ? "Chưa có nội dung trong mục này." : "No content in this category yet."}</p>}
          <div className="collab-box">
            <Heading level={2}>
              {vi
                ? "Quan tâm đến việc hợp tác?"
                : "Interested in collaborating?"}
            </Heading>
            <p>
              {vi
                ? "Chúng tôi chào đón sự hợp tác nghiên cứu với các trường đại học, phòng thí nghiệm và đối tác trong ngành."
                : "We welcome research partnerships with universities, labs, and industry partners."}
            </p>
            <Link className="btn" href="/contact?type=research-collaboration">
              {copy[lang].common.collab}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

const researchDetails = {
  "ai-agents": {
    type: ["Lĩnh vực Nghiên cứu", "Research Area"],
    date: "January 15, 2026",
    updated: "June 20, 2026",
    tags: [
      ["Tác nhân AI", "LLM", "Tự động hóa", "Lập kế hoạch"],
      ["AI Agents", "LLM", "Automation", "Task Planning"],
    ],
    sections: [
      [
        "Research Area",
        "We investigate AI agent systems capable of reliably executing complex, multi-step tasks in open-ended environments. Our focus is on making AI agents that work in practice — not just in benchmarks.",
      ],
      [
        "Key Research Questions",
        [
          "How can agents handle unexpected failures and recover gracefully?",
          "What planning representations enable efficient task decomposition?",
          "How do we evaluate agent reliability across diverse task domains?",
          "Can agents learn from user feedback to improve over time?",
        ],
      ],
      [
        "Current Work",
        [
          [
            "Workflow Execution Engine",
            "Building a robust execution engine for desktop and web automation tasks, including error detection and retry strategies.",
          ],
          [
            "Task Representation",
            "Exploring structured task representations that balance expressiveness with executability.",
          ],
          [
            "Human-Agent Collaboration",
            "Studying how users and AI agents can collaborate effectively, including clarification strategies and confidence communication.",
          ],
        ],
      ],
      [
        "Applications",
        "This research directly informs the Workflow Agent product, providing the algorithmic foundation for reliable automation.",
      ],
    ],
    related: [["Workflow Agent", "/products/workflow-agent"]],
  },
  "autonomous-navigation": {
    type: ["Dự án", "Project"],
    date: "March 1, 2026",
    updated: "June 15, 2026",
    tags: [
      ["Robot học", "Điều hướng", "SLAM", "Lập lộ trình"],
      ["Robotics", "Autonomous Navigation", "SLAM", "Path Planning"],
    ],
    sections: [
      [
        "Project Overview",
        "We develop and validate navigation systems for autonomous mobile robots operating in real, unstructured environments. The goal is to move beyond controlled lab conditions to reliable deployment in offices, warehouses, and outdoor spaces.",
      ],
      [
        "Research Topics",
        [
          [
            "Simultaneous Localization and Mapping (SLAM)",
            "Real-time 2D and 3D SLAM using LiDAR and camera data. We focus on robustness to sensor noise and dynamic environments.",
          ],
          [
            "Path Planning",
            "Combining classical planning (A*, RRT) with learned heuristics for faster, more adaptive navigation.",
          ],
          [
            "Obstacle Avoidance",
            "Dynamic obstacle prediction and avoidance at operational speeds, including handling moving people and objects.",
          ],
        ],
      ],
      [
        "Current Results",
        [
          "Reliable navigation in 200m² indoor environments",
          "Map building with <5cm error at 50m range",
          "Dynamic obstacle avoidance at 1.2 m/s operational speed",
        ],
      ],
      [
        "Platform",
        "Experiments conducted on the ARL Autonomous Robot Vehicle platform.",
      ],
    ],
    related: [
      ["ARL Autonomous Robot Vehicle", "/products/autonomous-robot-vehicle"],
    ],
  },
  "computer-vision": {
    type: ["Lĩnh vực Nghiên cứu", "Research Area"],
    date: "February 10, 2026",
    updated: "June 10, 2026",
    tags: [
      ["Thị giác máy tính", "Phát hiện đối tượng", "Robot học", "Học sâu"],
      ["Computer Vision", "Object Detection", "Robotics", "Deep Learning"],
    ],
    sections: [
      [
        "Research Area",
        "We focus on computer vision systems that are robust and practical — working reliably under real lighting conditions, with varying object appearances, and without expensive ground truth data collection.",
      ],
      [
        "Research Topics",
        [
          [
            "Object Detection & Tracking",
            "Real-time detection for robotics manipulation and navigation. We emphasize deployment efficiency alongside accuracy.",
          ],
          [
            "3D Print Quality Inspection",
            "Automated visual inspection of 3D printed parts for defects, dimensional accuracy, and surface quality.",
          ],
          [
            "Scene Understanding",
            "Semantic understanding of robot environments to enable context-aware task execution.",
          ],
        ],
      ],
      [
        "Methods",
        [
          "Transfer learning from large pretrained vision models",
          "Synthetic data generation for domain adaptation",
          "On-device optimization for edge deployment (Jetson, RPi)",
        ],
      ],
    ],
    related: [
      ["Autonomous Robot Vehicle", "/products/autonomous-robot-vehicle"],
      ["3D Printing Solutions", "/products/printing-3d-models"],
    ],
  },
} as const
function ResearchDetail({
  lang,
  slug,
}: {
  lang: Lang
  slug: keyof typeof researchDetails
}) {
  const item = researchItems[lang].find((x) =>
    (x[4] as string).endsWith(slug),
  )!,
    d = researchDetails[slug],
    vi = lang === "vi",
    idx = vi ? 0 : 1
  return (
    <>
      <div className="container">
        <Breadcrumbs
          lang={lang}
          current={item[1] as string}
          parent={copy[lang].common.research}
        />
      </div>
      <article className="article">
        <header className="article-header">
          <div className="container article-head-grid">
            <div>
              <span className="eyebrow">
                {d.type[idx]} · active · {d.date}
              </span>
              <Heading level={1}>{item[1] as string}</Heading>
              <p>{item[2] as string}</p>
              <div className="article-meta">
                By Applied Robotics Lab <span>· Updated {d.updated}</span>
              </div>
              <div className="tag-row">
                {d.tags[idx].map((x) => (
                  <span key={x}>{x}</span>
                ))}
              </div>
            </div>
            <div className="research-hero-visual">
              <span>ARL RESEARCH</span>
              <b>0{Object.keys(researchDetails).indexOf(slug) + 1}</b>
              <i />
              <i />
            </div>
          </div>
        </header>
        <div className="container article-body">
          {d.sections.map((s: any) => (
            <section
              key={s[0]}
              id={String(s[0]).toLowerCase().replace(/\s+/g, "-")}
            >
              <Heading level={2}>{s[0]}</Heading>
              {typeof s[1] === "string" ? (
                <p>
                  {s[1]}{" "}
                  {s[0] === "Applications" && (
                    <Link href="/products/workflow-agent">Workflow Agent</Link>
                  )}
                  {s[0] === "Platform" && (
                    <Link href="/products/autonomous-robot-vehicle">
                      {" "}
                      ARL Autonomous Robot Vehicle
                    </Link>
                  )}
                </p>
              ) : Array.isArray(s[1][0]) ? (
                <div className="article-subgrid">
                  {s[1].map((x: string[]) => (
                    <div key={x[0]}>
                      <Heading level={3}>{x[0]}</Heading>
                      <p>{x[1]}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <ul>
                  {s[1].map((x: string) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          <section className="related">
            <Heading level={2}>
              {vi ? "Sản phẩm Liên quan" : "Related Products"}
            </Heading>
            {d.related.map(([name, href]) => (
              <Link className="text-link" href={href} key={href}>
                {vi ? "Xem Sản phẩm" : "See Product"}{" "}
                {lang === "vi" && name === "Autonomous Robot Vehicle"
                  ? "Robot tự hành"
                  : lang === "vi" && name === "3D Printing Solutions"
                    ? "Giải pháp In 3D"
                    : name}{" "}
                <Arrow />
              </Link>
            ))}
          </section>
          <section className="collab-box">
            <Heading level={2}>
              {vi
                ? "Quan tâm đến việc hợp tác trong nghiên cứu này?"
                : "Interested in collaborating on this research?"}
            </Heading>
            <Link className="btn" href="/contact?type=research-collaboration">
              {copy[lang].common.collab}
            </Link>
          </section>
        </div>
      </article>
    </>
  )
}

function About({ lang }: { lang: Lang }) {
  const cms = useCms()
  const aboutPage = pageByKey(cms, "about")
  const vi = lang === "vi"
  const values = aboutPage?.mission_title_vi ? ["mission", "vision", "philosophy"].map(key => [aboutPage[`${key}_title_${lang}`], aboutPage[`${key}_text_${lang}`]]) : vi
    ? [
      [
        "Nhiệm vụ",
        "Xây dựng công cụ tự động hóa thông minh và hệ thống robot thực sự cải thiện cách mọi người làm việc — dễ tiếp cận cho cả đội ngũ kỹ thuật và người dùng không chuyên.",
      ],
      [
        "Tầm nhìn",
        "Một thế giới nơi AI và robot đảm nhận những việc lặp đi lặp lại, nguy hiểm và tẻ nhạt — giải phóng con người cho công việc sáng tạo, chiến lược và ý nghĩa hơn.",
      ],
      [
        "Triết lý",
        "Triển khai những gì hoạt động được. Bắt đầu từ bài toán thực tế. Lặp lại nhanh. Luôn gần gũi với người dùng. Nghiên cứu chỉ có ý nghĩa nếu nó trở thành hiện thực.",
      ],
    ]
    : [
      [
        "Mission",
        "Build intelligent automation tools and robotic systems that genuinely improve how people work — accessible to both technical teams and non-technical users.",
      ],
      [
        "Vision",
        "A world where AI and robots handle the repetitive, dangerous, and tedious — freeing humans for creative, strategic, and meaningful work.",
      ],
      [
        "Philosophy",
        "Ship working things. Start with real problems. Iterate fast. Stay close to users. Research only matters if it becomes reality.",
      ],
    ]
  const team = vi
    ? [
      [
        "TS. Lê Trần Hữu Phúc",
        "Sáng lập & Giám đốc Nghiên cứu",
        "Nhà nghiên cứu hàng đầu về hệ thống AI và học tăng cường. Từng là nghiên cứu sinh sau tiến sĩ tại các phòng thí nghiệm robot hàng đầu.",
        "Tác nhân AI & Hệ thống Quyết định",
      ],
      [
        "Lê Châu Phúc Vinh",
        "Trưởng Lab và nhóm nghiên cứu",
        "Chuyên gia ROS 2 và nhà phát triển hệ thống phần cứng. Hơn 6 năm kinh nghiệm thiết kế chế tạo robot di động tự hành.",
        "Điều hướng Tự hành & Động học",
      ],
      [
        "Phan Công Danh",
        "Trưởng nhóm dự án",
        "Nhà phát triển Fullstack chuyên về bảng điều khiển thời gian thực và hệ thống điều phối desktop hiệu suất cao.",
        "Giao diện Điều khiển & Nền tảng Web",
      ],
      [
        "Nguyễn Anh Huy",
        "Trưởng nhóm IoT",
        "Chuyên gia về kiến trúc IoT, hệ thống nhúng và mạng cảm biến. Hơn 5 năm kinh nghiệm kết nối các thiết bị vật lý với nền tảng đám mây.",
        "Hệ thống IoT & Phần cứng nhúng",
      ],
    ]
    : [
      [
        "Dr. Anh Nguyen",
        "Founder & Research Director",
        "Lead researcher in AI systems and reinforcement learning. Formerly post-doc at leading robotics laboratories.",
        "AI Agents & Decision Systems",
      ],
      [
        "Bao Tran",
        "Lead Robotics Engineer",
        "ROS 2 specialist and hardware systems developer. Over 6 years design experience building autonomous mobile robots.",
        "Autonomous Navigation & Kinematics",
      ],
      [
        "Linh Pham",
        "Senior Software Engineer",
        "Fullstack developer specializing in real-time control panels and high-performance desktop orchestration systems.",
        "Control Interfaces & Web Platforms",
      ],
      [
        "Huy Nguyen",
        "IoT Team Lead",
        "Specialist in IoT architectures, embedded systems, and sensor networks. Over 5 years of experience connecting physical devices to cloud platforms.",
        "IoT Systems & Embedded Hardware",
      ],
    ]
  const visibleTeam = cms ? (cms.Members || []).filter(m => m.editorial_status === "ready" && m.is_archived !== true).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(m => [m.display_name, m[`role_${lang}`], m[`bio_${lang}`], m[`expertise_${lang}`]]) : team
  const managedFocuses = (cms?.Content_Blocks || []).filter(x => x.owner_type === "page" && x.owner_id === "PAGE_ABOUT" && x.section_key === "focuses" && x.is_active !== false).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  const focuses = managedFocuses.length ? managedFocuses.map(x => x[`title_${lang}`]) : vi
    ? [
      "Tự động hóa desktop và web hỗ trợ AI",
      "Robot di động tự hành (ROS 2)",
      "Thị giác máy tính cho kiểm tra và điều hướng",
      "Tác nhân AI Zalo cho doanh nghiệp Việt Nam",
      "In 3D để tạo mẫu robot nhanh",
    ]
    : [
      "AI-powered desktop and web automation",
      "Autonomous mobile robotics (ROS 2)",
      "Computer vision for inspection and navigation",
      "Zalo AI agents for Vietnamese businesses",
      "3D printing for rapid robotics prototyping",
    ]
  return (
    <>
      <div className="container">
        <Breadcrumbs lang={lang} current={copy[lang].nav.about} />
      </div>
      <PageIntro
        eyebrow={vi ? "Về ARL" : "About ARL"}
        title={aboutPage?.[`hero_title_${lang}`] ||
          (vi
            ? "Chúng tôi xây dựng hệ thống hoạt động trong thế giới thực, không chỉ trong phòng thí nghiệm."
            : "We build systems that work in the world, not just in demos.")
        }
        text={aboutPage?.[`hero_text_${lang}`] ||
          (vi
            ? "Applied Robotics Lab được thành lập với một niềm tin duy nhất: khoảng cách giữa nghiên cứu AI/robotics tiên phong và sản phẩm thực tế có thể triển khai là quá lớn — và chúng tôi ở đây để thu hẹp nó."
            : "Applied Robotics Lab was founded with a single belief: the gap between cutting-edge AI/robotics research and practical, deployable products is too wide — and we're here to close it.")
        }
      />
      <section className="section section-tight">
        <div className="container value-grid">
          {values.map((x, i) => (
            <div key={x[0]}>
              <span>0{i + 1}</span>
              <Heading level={2}>{x[0]}</Heading>
              <p>{x[1]}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="section section-blue">
        <div className="container about-grid">
          <div>
            <span className="eyebrow">
              {vi ? "Chúng tôi làm gì" : "What We Do"}
            </span>
            <Heading level={2}>
              {vi
                ? "Sản phẩm, nghiên cứu, và tất cả mọi thứ ở giữa"
                : "Products, research, and everything in between"}
            </Heading>
            <p>
              {vi
                ? "ARL hoạt động tại điểm giao thoa giữa nghiên cứu ứng dụng và phát triển sản phẩm. Chúng tôi vận hành chương trình nghiên cứu tích cực về tác nhân AI, thị giác máy tính và điều hiện tự hành — đồng thời chuyển đổi các nghiên cứu đó thành các sản phẩm và dịch vụ mà khách hàng của chúng tôi sử dụng ngày nay."
                : "ARL operates at the intersection of applied research and product development. We run an active research program in AI agents, computer vision, and autonomous navigation — and we turn that research into products and services our clients use today."}
            </p>
            <strong>
              {vi ? "Các lĩnh vực trọng tâm:" : "Our focus areas:"}
            </strong>
            <ul>
              {focuses.map((x) => (
                <li key={x}>✓ {x}</li>
              ))}
            </ul>
          </div>
          <MediaPlaceholder
            kind="lab"
            label="Applied Robotics Lab research workspace showing robotic arm testing and electronics setup"
          />
        </div>
      </section>
      {visibleTeam.length > 0 && <section className="section">
        <div className="container">
          <SectionHead
            eyebrow={vi ? "Đội ngũ" : "Team"}
            title={vi ? "Những người đứng sau ARL" : "The people behind ARL"}
            text={
              vi
                ? "Đội ngũ nghiên cứu và kỹ thuật của chúng tôi thu hẹp khoảng cách giữa lý thuyết khoa học và sản phẩm thực tế có thể triển khai."
                : "Our research and engineering team bridges the gap between scientific theory and deployable products."
            }
          />
          <div className="team-grid">
            {visibleTeam.map((x, i) => (
              <article key={x[0]}>
                <div className="avatar">0{i + 1}</div>
                <Heading level={3}>{x[0]}</Heading>
                {x[1] && <strong>{x[1]}</strong>}
                {x[2] && <p>{x[2]}</p>}
                {x[3] && <span>{x[3]}</span>}
              </article>
            ))}
          </div>
        </div>
      </section>}
      <section className="section section-yellow">
        <div className="container final-cta">
          <Heading level={2}>
            {vi ? "Hợp tác cùng ARL" : "Work with ARL"}
          </Heading>
          <p>
            {vi
              ? "Quan tâm đến hợp tác nghiên cứu, đối tác sản phẩm, hay chỉ muốn nói lời chào?"
              : "Interested in research collaboration, product partnerships, or just want to say hi?"}
          </p>
          <div className="button-row">
            <Link className="btn" href="/contact?type=partnership">
              {vi ? "Yêu cầu Đối tác" : "Partnership Inquiry"}
            </Link>
            <Link
              className="btn btn-ghost"
              href="/contact?type=research-collaboration"
            >
              {vi ? "Hợp tác Nghiên cứu" : "Research Collaboration"}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

function Contact({ lang }: { lang: Lang }) {
  const cms = useCms()
  const page = pageByKey(cms, "contact")
  const email = siteSetting(cms, "contact_email", lang) || "zally.aihoc@gmail.com"
  const responseTime = siteSetting(cms, "response_time", lang)
  const availableProducts = productsFor(cms, lang)
  const vi = lang === "vi",
    params = new URLSearchParams(cmsSearch())
  const typeMap: Record<string, string> = {
    "request-demo": "product-demo",
    "request-access": "request-access",
    "product-inquiry": "product-inquiry",
    "research-collaboration": "research-collaboration",
    "enterprise-workflow": "enterprise-workflow",
    partnership: "partnership",
  }
  const [sent, setSent] = useState(false),
    [sending, setSending] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const submissionKey = useRef(crypto.randomUUID())
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget),
      next: Record<string, string> = {}
    if (!String(fd.get("name") || "").trim()) next.name = "Name is required."
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(fd.get("email") || "")))
      next.email = "Valid email is required."
    const phone = String(fd.get("phone") || "").trim()
    if (!phone) next.phone = vi ? "Vui lòng nhập số điện thoại." : "Phone number is required."
    else if (!/^\+?[0-9][0-9()\s.-]{5,24}$/.test(phone) || phone.replace(/\D/g, "").length < 7 || phone.replace(/\D/g, "").length > 15)
      next.phone = vi ? "Số điện thoại không hợp lệ." : "Enter a valid phone number."
    if (String(fd.get("message") || "").trim().length < 10)
      next.message = "Message must be at least 10 characters."
    if (!fd.get("inquiry_type")) next.inquiry_type = vi ? "Chọn loại yêu cầu." : "Choose an inquiry type."
    if (!fd.get("consent")) next.consent = vi ? "Cần đồng ý chính sách bảo mật." : "Consent is required."
    setErrors(next)
    if (Object.keys(next).length) return
    setSending(true)
    try {
      const response = await fetch("/api/inquiries", { method: "POST", headers: { "content-type": "application/json", "Idempotency-Key": submissionKey.current }, body: JSON.stringify({ name: fd.get("name"), email: fd.get("email"), phone, company: fd.get("company"), inquiry_type: fd.get("inquiry_type"), product_id: fd.get("product"), solution_id: params.get("solution"), message: fd.get("message"), website: fd.get("website"), consent: Boolean(fd.get("consent")), source_path: window.location.pathname, locale: lang }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Unable to submit")
      setSent(true)
      submissionKey.current = crypto.randomUUID()
    } catch (error) { setErrors({ form: error instanceof Error ? error.message : String(error) }) }
    finally { setSending(false) }
  }
  return (
    <>
      <div className="container">
        <Breadcrumbs lang={lang} current={copy[lang].nav.contact} />
      </div>
      <PageIntro
        eyebrow={copy[lang].nav.contact}
        title={page?.[`hero_title_${lang}`] || (vi ? "Trò chuyện về robot & AI" : "Let's talk robots & AI")}
        text={
          responseTime ? (vi ? `Chia sẻ về dự án của bạn. Chúng tôi sẽ phản hồi trong vòng ${responseTime}.` : `Tell us what you're working on. We'll get back to you within ${responseTime}.`) : vi
            ? "Chia sẻ về dự án của bạn. Chúng tôi sẽ phản hồi trong vòng 1–2 ngày làm việc."
            : "Tell us what you're working on. We'll get back to you within 1–2 business days."
        }
      />
      <section className="section section-tight">
        <div className="container contact-grid">
          <form id="contact-form" onSubmit={submit} noValidate>
            <label className="honeypot">
              Website (leave blank)
              <input
                id="website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
              />
            </label>
            <Field
              label={vi ? "Họ và tên *" : "Full name *"}
              error={errors.name}
            >
              <input
                id="name"
                name="name"
                type="text"
                placeholder={vi ? "Tên của bạn" : "Your name"}
              />
            </Field>
            <Field
              label={vi ? "Email công việc *" : "Work email *"}
              error={errors.email}
            >
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
              />
            </Field>
            <Field label={vi ? "Công ty / Tổ chức" : "Company / Organization"}>
              <input
                id="company"
                name="company"
                type="text"
                placeholder={
                  vi
                    ? "Tên công ty hoặc trường học"
                    : "Your company or university"
                }
              />
            </Field>
            <Field label={vi ? "Số điện thoại *" : "Phone number *"} error={errors.phone}>
              <input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={25} required placeholder={vi ? "Ví dụ: 090 123 4567" : "For example: +84 90 123 4567"} />
            </Field>
            <Field label={vi ? "Loại yêu cầu *" : "Inquiry type *"}>
              <select
                id="inquiry-type"
                name="inquiry_type"
                defaultValue={
                  typeMap[params.get("type") || ""] || params.get("type") || ""
                }
              >
                <option value="">
                  {vi ? "Chọn loại yêu cầu" : "Select inquiry type"}
                </option>
                <option value="product-demo">
                  {vi ? "Demo sản phẩm" : "Product Demo"}
                </option>
                <option value="request-access">{vi ? "Truy cập sớm" : "Early Access"}</option>
                <option value="product-inquiry">{vi ? "Yêu cầu báo giá" : "Product Inquiry"}</option>
                <option value="product-support">
                  {vi ? "Hỗ trợ sản phẩm" : "Product Support"}
                </option>
                <option value="enterprise-workflow">
                  {vi ? "Tự động hóa doanh nghiệp" : "Enterprise Workflow"}
                </option>
                <option value="research-collaboration">
                  {vi ? "Hợp tác nghiên cứu" : "Research Collaboration"}
                </option>
                <option value="partnership">
                  {vi ? "Quan hệ đối tác" : "Partnership"}
                </option>
                <option value="general">
                  {vi ? "Yêu cầu chung" : "General Inquiry"}
                </option>
              </select>
              {errors.inquiry_type && <small role="alert">{errors.inquiry_type}</small>}
            </Field>
            <Field label={vi ? "Sản phẩm quan tâm" : "Product of interest"}>
              <select
                id="product"
                name="product"
                defaultValue={params.get("product") || ""}
              >
                <option value="">
                  {vi ? "Không cụ thể sản phẩm" : "Not product-specific"}
                </option>
                {availableProducts ? availableProducts.map(p => <option key={p.slug} value={p.slug}>{p.title}</option>) : <><option value="workflow-agent">Workflow Agent</option><option value="printing-3d-models">{vi ? "Giải pháp In 3D" : "3D Printing Solutions"}</option><option value="autonomous-robot-vehicle">{vi ? "Robot tự hành" : "Autonomous Robot Vehicle"}</option></>}
              </select>
            </Field>
            <Field
              label={vi ? "Lời nhắn *" : "Message *"}
              error={errors.message}
            >
              <textarea
                id="message"
                name="message"
                rows={6}
                placeholder={
                  vi
                    ? "Mô tả về dự án, mục tiêu hoặc câu hỏi của bạn..."
                    : "Tell us about your project, goals, or question..."
                }
              />
            </Field>
            <label className="consent">
              <input id="consent" name="consent" type="checkbox" required />
              <span>
                {vi
                  ? "Tôi đồng ý để ARL xử lý thông tin tôi cung cấp, gồm số điện thoại, nhằm tiếp nhận và phản hồi yêu cầu này theo "
                  : "I agree to ARL processing the information I provide, including my phone number, to receive and respond to this inquiry under the "}
                <Link href="/privacy-policy">
                  {vi ? "Chính sách bảo vệ dữ liệu cá nhân" : "Personal Data Protection Policy"}
                </Link>
                . *
              </span>
            </label>
            {errors.consent && <small role="alert">{errors.consent}</small>}
            <Button className="btn submit" type="submit" disabled={sending}>
              {sending ? "..." : vi ? "Gửi tin nhắn" : "Send Message"} <Arrow />
            </Button>
            {errors.form && <div className="success" role="alert">{errors.form}</div>}
            {sent && (
              <div className="success" id="form-success">
                ✓{" "}
                {vi
                  ? "Đã gửi tin nhắn! Chúng tôi sẽ phản hồi trong vòng 1-2 ngày làm việc."
                  : "Message sent! We'll get back to you within 1–2 business days."}
              </div>
            )}
          </form>
          <aside className="contact-aside">
            <div>
              <Heading level={2}>
                {vi ? "Liên hệ trực tiếp" : "Direct contact"}
              </Heading>
              <Link href={`mailto:${email}`}>{email}</Link>
            </div>
            <div>
              <Heading level={2}>
                {vi ? "Thời gian phản hồi" : "Response time"}
              </Heading>
              <p>
                {vi
                  ? "Chúng tôi thường phản hồi trong vòng 1–2 ngày làm việc . Đối với các vấn đề khẩn cấp, vui lòng email trực tiếp."
                  : "We typically respond within 1–2 business days . For urgent matters, email us directly."}
              </p>
            </div>
            <div>
              <Heading level={2}>
                {vi ? "Yêu cầu nhanh" : "Quick inquiries"}
              </Heading>
              <Link href="/contact?type=product-demo">
                {vi ? "Yêu cầu Demo" : "Request a Demo"} <Arrow />
              </Link>
              <Link href="/contact?type=enterprise-workflow">
                {vi ? "Tự động hóa doanh nghiệp" : "Enterprise Automation"}{" "}
                <Arrow />
              </Link>
              <Link href="/contact?type=research-collaboration">
                {vi ? "Hợp tác nghiên cứu" : "Research Partnership"} <Arrow />
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </>
  )
}
function Field({
  label,
  children,
  error,
}: {
  label: string
  children: ReactNode
  error?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error && <small className="error">{error}</small>}
    </label>
  )
}

function LegalBody({ text }: { text: string }) {
  const chunks = text.trim().split(/\n\s*\n/).filter(Boolean)
  return <>{chunks.map((chunk, index) => {
    const lines = chunk.split("\n").map(line => line.trim()).filter(Boolean)
    if (lines.length >= 3 && lines.every(line => line.startsWith("|") && line.endsWith("|")) && /^\|[\s:|-]+\|$/.test(lines[1])) {
      const cells = (line: string) => line.slice(1, -1).split("|").map(cell => cell.trim())
      return <div className="legal-table-scroll" key={index}><table><thead><tr>{cells(lines[0]).map((cell, column) => <th key={column} scope="col">{cell}</th>)}</tr></thead><tbody>{lines.slice(2).map((line, row) => <tr key={row}>{cells(line).map((cell, column) => <td key={column}>{cell}</td>)}</tr>)}</tbody></table></div>
    }
    return <p key={index}>{lines.join(" ")}</p>
  })}</>
}

function Legal({ lang, type }: { lang: Lang; type: "privacy" | "terms" }) {
  const cms = useCms()
  const page = pageByKey(cms, type === "privacy" ? "privacy-policy" : "terms-of-use")
  const managedSections = (cms?.Content_Blocks || []).filter(x => x.owner_type === "page" && x.owner_id === page?.page_id && x.section_key === "legal" && x.is_active !== false).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  if (managedSections.length) return <><div className="container"><Breadcrumbs lang={lang} current={page?.[`title_${lang}`]} /></div><article className="legal container"><header><h1>{page?.[`title_${lang}`]}</h1>{page?.legal_draft_status === "pending_facts" && <p className="legal-draft-notice" role="note">{lang === "vi" ? "BẢN NHÁP XEM TRƯỚC — Chưa có hiệu lực, chưa công bố. Những chỗ {{...}} cần điền thông tin thật trước khi phát hành." : "DRAFT PREVIEW — Not effective or published. Fields marked {{...}} need verified facts before release."}</p>}<p className="legal-intro">{page?.[`intro_${lang}`]}</p></header>{managedSections.map(section => <section key={section.block_id}><h2>{section[`title_${lang}`]}</h2><LegalBody text={String(section[`text_${lang}`] || "")} /></section>)}</article></>
  const vi = lang === "vi",
    privacy = type === "privacy"
  const title = privacy
    ? vi
      ? "Chính sách Bảo mật"
      : "Privacy Policy"
    : vi
      ? "Điều khoản Sử dụng"
      : "Terms of Use"
  const intro = privacy
    ? vi
      ? 'Applied Robotics Lab ("ARL", "chúng tôi") tôn trọng quyền riêng tư của bạn. Chính sách này mô tả những dữ liệu chúng tôi thu thập, lý do và cách chúng tôi bảo vệ chúng.'
      : 'Applied Robotics Lab ("ARL", "we", "us") respects your privacy. This policy describes what data we collect, why, and how we protect it.'
    : vi
      ? "Bằng cách sử dụng trang web này và các sản phẩm của ARL, bạn đồng ý với các điều khoản này."
      : "By using this website and ARL products, you agree to these terms."
  const sections = privacy
    ? vi
      ? [
        [
          "1. Thông tin Chúng tôi Thu thập",
          "Chúng tôi thu thập thông tin bạn tự nguyện cung cấp qua biểu mẫu liên hệ, bao gồm tên, địa chỉ email, tên công ty và nội dung tin nhắn. Chúng tôi không bán dữ liệu này.",
        ],
        [
          "2. Cách Chúng tôi Sử dụng Thông tin",
          [
            "Để phản hồi các yêu cầu của bạn",
            "Để thông báo cho bạn về các cập nhật sản phẩm mà bạn đã yêu cầu",
            "Để cải thiện sản phẩm và dịch vụ của chúng tôi",
          ],
        ],
        [
          "3. Phân tích",
          "Chúng tôi có thể sử dụng các công cụ phân tích tôn trọng quyền riêng tư (ví dụ: Umami hoặc Plausible) không theo dõi cá nhân, không sử dụng cookie hoặc chia sẻ dữ liệu với bên thứ ba. Phân tích là tổng hợp và ẩn danh.",
        ],
        [
          "4. Lưu trữ Dữ liệu",
          "Thông tin gửi qua biểu mẫu liên hệ được lưu trữ tối đa 2 năm trừ khi bạn yêu cầu xóa trước hạn.",
        ],
        [
          "5. Quyền của Bạn",
          "Bạn có thể yêu cầu truy cập, sửa đổi hoặc xóa dữ liệu cá nhân của mình bằng cách gửi email đến zally.aihoc@gmail.com .",
        ],
        [
          "6. Bảo mật",
          "Chúng tôi sử dụng HTTPS và các biện pháp bảo mật tiêu chuẩn ngành. Dữ liệu biểu mẫu liên hệ được truyền tải an toàn và lưu trữ với quyền truy cập bị hạn chế.",
        ],
        [
          "7. Liên hệ",
          "Đối với các câu hỏi liên quan đến quyền riêng tư, vui lòng liên hệ zally.aihoc@gmail.com .",
        ],
      ]
      : [
        [
          "1. Information We Collect",
          "We collect information you voluntarily provide through our contact form, including your name, email address, company name, and message content. We do not sell this data.",
        ],
        [
          "2. How We Use Your Information",
          [
            "To respond to your inquiries",
            "To notify you about product updates you've requested",
            "To improve our products and services",
          ],
        ],
        [
          "3. Analytics",
          "We may use privacy-respecting analytics tools (e.g., Umami or Plausible) that do not track individuals, use cookies, or share data with third parties. Analytics are aggregated and anonymous.",
        ],
        [
          "4. Data Retention",
          "Contact form submissions are retained for up to 2 years unless you request deletion earlier.",
        ],
        [
          "5. Your Rights",
          "You may request access to, correction of, or deletion of your personal data by emailing zally.aihoc@gmail.com .",
        ],
        [
          "6. Security",
          "We use HTTPS and industry-standard security practices. Contact form data is transmitted securely and stored with restricted access.",
        ],
        [
          "7. Contact",
          "For privacy-related questions, contact zally.aihoc@gmail.com .",
        ],
      ]
    : vi
      ? [
        [
          "1. Sử dụng Trang web",
          "Trang web này được cung cấp cho mục đích thông tin. Bạn không được sử dụng nó cho bất kỳ mục đích bất hợp pháp nào hoặc theo cách gây hại, vô hiệu hóa hoặc làm suy giảm các dịch vụ của ARL.",
        ],
        [
          "2. Sở hữu Trí tuệ",
          "Tất cả nội dung, nhãn hiệu và tên sản phẩm đều thuộc sở hữu của Applied Robotics Lab trừ khi có ghi chú khác. Việc sao chép mà không có sự cho phép bằng văn bản là bị cấm.",
        ],
        [
          "3. Sản phẩm & Dịch vụ",
          "Sự sẵn có, giá cả và thông số kỹ thuật của sản phẩm có thể thay đổi mà không cần thông báo trước. Việc sử dụng các sản phẩm của ARL được điều chỉnh bởi các thỏa thuận cấp phép riêng biệt được cung cấp tại thời điểm truy cập hoặc tải xuống.",
        ],
        [
          "4. Tuyên bố Từ chối Bảo đảm",
          'Trang web này và nội dung của nó được cung cấp "như hiện tại" mà không có bất kỳ sự bảo đảm nào. ARL không đảm bảo tính chính xác, đầy đủ hoặc tính khả dụng không gián đoạn.',
        ],
        [
          "5. Giới hạn Trách nhiệm pháp lý",
          "ARL sẽ không chịu trách nhiệm cho các thiệt hại gián tiếp, ngẫu nhiên hoặc do hậu quả phát sinh từ việc sử dụng trang web này hoặc các sản phẩm của ARL, trong phạm vi tối đa được luật pháp hiện hành cho phép.",
        ],
        [
          "6. Luật Điều chỉnh",
          "Các điều khoản này được điều chỉnh bởi luật pháp Việt Nam, không tính đến các quy định về xung đột pháp luật.",
        ],
        [
          "7. Liên hệ",
          "Câu hỏi về các điều khoản này? Gửi email đến zally.aihoc@gmail.com .",
        ],
      ]
      : [
        [
          "1. Use of Website",
          "This website is provided for informational purposes. You may not use it for any unlawful purpose or in a way that damages, disables, or impairs ARL's services.",
        ],
        [
          "2. Intellectual Property",
          "All content, trademarks, and product names are owned by Applied Robotics Lab unless noted otherwise. Reproduction without written permission is prohibited.",
        ],
        [
          "3. Products & Services",
          "Product availability, pricing, and specifications are subject to change without notice. Use of ARL products is governed by separate license agreements provided at the time of access or download.",
        ],
        [
          "4. Disclaimer of Warranties",
          'This website and its content are provided "as is" without warranties of any kind. ARL does not guarantee accuracy, completeness, or uninterrupted availability.',
        ],
        [
          "5. Limitation of Liability",
          "ARL shall not be liable for indirect, incidental, or consequential damages arising from use of this website or ARL products, to the maximum extent permitted by applicable law.",
        ],
        [
          "6. Governing Law",
          "These terms are governed by the laws of Vietnam, without regard to conflict of law provisions.",
        ],
        ["7. Contact", "Questions about these terms? Email zally.aihoc@gmail.com ."],
      ]
  return (
    <>
      <div className="container">
        <Breadcrumbs lang={lang} current={title} />
      </div>
      <article className="legal container">
        <Heading level={1}>{title}</Heading>
        <span>
          {vi
            ? "Cập nhật lần cuối: Ngày 1 tháng 7 năm 2026"
            : "Last updated: July 1, 2026"}
        </span>
        <p className="legal-intro">{intro}</p>
        {sections.map((x: any) => (
          <section key={x[0]}>
            <Heading level={2}>{x[0]}</Heading>
            {Array.isArray(x[1]) ? (
              <ul>
                {x[1].map((y: string) => (
                  <li key={y}>{y}</li>
                ))}
              </ul>
            ) : (
              <p>
                {x[1]}{" "}
                {(x[0].startsWith("5.") || x[0].startsWith("7.")) && (
                  <Link href="mailto:zally.aihoc@gmail.com">zally.aihoc@gmail.com</Link>
                )}
              </p>
            )}
          </section>
        ))}
      </article>
    </>
  )
}
function NotFound({ lang }: { lang: Lang }) {
  const vi = lang === "vi"
  return (
    <section className="not-found">
      <div className="container">
        <strong>404</strong>
        <Heading level={1}>
          {vi ? "Không tìm thấy trang" : "Page not found"}
        </Heading>
        <p>
          {vi
            ? "Trang này không tồn tại — hoặc đã bị di chuyển. Hãy thử điều hướng từ menu ở trên."
            : "This page doesn't exist — or was moved. Try navigating from the menu above."}
        </p>
        <div className="button-row">
          <Link className="btn" href="/">
            {copy[lang].common.goHome}
          </Link>
          <Link className="btn btn-ghost" href="/products">
            {vi ? "Xem Sản phẩm" : "View Products"}
          </Link>
          <Link className="text-link" href="/contact">
            {vi ? "Liên hệ" : "Contact Us"}
          </Link>
        </div>
      </div>
    </section>
  )
}

function Router({ lang }: { lang: Lang }) {
  const cms = useCms()
  const path = cmsPath()
  if (path === "/") return <Home lang={lang} />
  if (path === "/products") return <ProductsPage lang={lang} />
  if (path.startsWith("/products/")) {
    const slug = path.split("/").pop() as keyof typeof details
    const item = cms?.Products?.find(x => x.slug === slug)
    if (item) return <CmsProductDetail lang={lang} item={item} />
    if (details[slug]) return <ProductDetail lang={lang} slug={slug} />
  }
  if (path === "/solutions") return <Solutions lang={lang} />
  if (path === "/research") return <Research lang={lang} />
  if (path.startsWith("/research/")) {
    const slug = path.split("/").pop() as keyof typeof researchDetails
    const item = cms?.Research?.find(x => x.slug === slug)
    if (item) return <CmsResearchDetail lang={lang} item={item} />
    if (researchDetails[slug]) return <ResearchDetail lang={lang} slug={slug} />
  }
  if (path === "/about") return <About lang={lang} />
  if (path === "/contact") return <Contact lang={lang} />
  if (path === "/privacy-policy") return <Legal lang={lang} type="privacy" />
  if (path === "/terms-of-use") return <Legal lang={lang} type="terms" />
  return <NotFound lang={lang} />
}

type Theme = "light" | "dark"

function getInitialThemeState(): { theme: Theme; isManual: boolean } {
  let stored: string | null = null
  try {
    stored = localStorage.getItem("arl-theme")
  } catch (e) { }

  if (stored === "dark" || stored === "light") {
    return { theme: stored, isManual: true }
  }

  const prefersDark =
    typeof window !== "undefined" &&
    !!(
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    )
  return { theme: prefersDark ? "dark" : "light", isManual: false }
}

function applyThemeToDocument(theme: Theme) {
  if (typeof document === "undefined") return
  const isDark = theme === "dark"
  document.documentElement.classList.toggle("dark", isDark)
  document.documentElement.setAttribute("data-theme", theme)
  document.documentElement.style.colorScheme = theme
}

export default function App({ initialContent = null }: { initialContent?: CmsContent | null }) {
  const [lang, setLang] = useState<Lang>(() => {
    return cmsLang()
  })
  const [cms, setCms] = useState<CmsContent | null>(() => initialContent || (typeof window !== "undefined" ? (window as any).__ARL_CONTENT || null : null))
  const [routeKey, setRouteKey] = useState(0)
  const [theme, setTheme] = useState<Theme>("light")
  const isManualThemeRef = useRef<boolean>(false)
  const [, rerender] = useState(0)

  useEffect(() => {
    if (cms) return
    const previewId = window.location.pathname.match(/^\/preview\/([^/]+)/)?.[1]
    const role = localStorage.getItem("arl-cms-role") || "editor"
    fetch(previewId ? `/api/candidates/${previewId}` : "/api/content", { headers: previewId ? { "X-ARL-User": role } : {}, credentials: "same-origin" })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(value => setCms(previewId ? value.content : value))
      .catch(() => setCms(null))
  }, [cms])

  useEffect(() => {
    applyThemeToDocument(theme)
  }, [theme])

  useEffect(() => {
    const initial = getInitialThemeState()
    isManualThemeRef.current = initial.isManual
    setTheme(initial.theme)
  }, [])

  useEffect(() => {
    const click = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest("a")
      if (
        !link ||
        link.target === "_blank" ||
        link.origin !== location.origin ||
        link.getAttribute("href")?.startsWith("mailto:")
      )
        return
      e.preventDefault()
      const next = link.pathname + link.search + link.hash
      history.pushState({}, "", next)
      rerender((x) => x + 1)
      setRouteKey(x => x + 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
      if (link.hash)
        setTimeout(
          () =>
            document
              .querySelector(link.hash)
              ?.scrollIntoView({ behavior: "smooth" }),
          0,
        )
    }
    const pop = () => { rerender((x) => x + 1); setRouteKey(x => x + 1); setLang(cmsLang()) }
    document.addEventListener("click", click)
    window.addEventListener("popstate", pop)
    return () => {
      document.removeEventListener("click", click)
      window.removeEventListener("popstate", pop)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem("arl-lang", lang)
    } catch (e) { }
    document.documentElement.lang = lang
  }, [lang])

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = (e: MediaQueryListEvent) => {
      if (isManualThemeRef.current) return
      try {
        const stored = localStorage.getItem("arl-theme")
        if (stored === "light" || stored === "dark") {
          isManualThemeRef.current = true
          return
        }
      } catch (err) { }

      const next: Theme = e.matches ? "dark" : "light"
      setTheme(next)
    }
    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  const toggleTheme = () => {
    isManualThemeRef.current = true
    const next: Theme = theme === "dark" ? "light" : "dark"
    setTheme(next)
    try {
      localStorage.setItem("arl-theme", next)
    } catch (e) { }
  }

  const page = useMemo(
    () => <CmsContext.Provider value={cms}><Router key={routeKey} lang={lang} /></CmsContext.Provider>,
    [lang, cms, routeKey],
  )
  const changeLang = (next: Lang) => {
    const path = cmsPath()
    const preview = window.location.pathname.match(/^\/preview\/[^/]+/)?.[0] || ""
    history.pushState({}, "", `${preview}${next === "en" ? "/en" : ""}${path}${window.location.search}${window.location.hash}`)
    setLang(next)
    setRouteKey(x => x + 1)
  }
  return (
    <CmsContext.Provider value={cms}><PageShell
      lang={lang}
      setLang={changeLang}
      theme={theme}
      toggleTheme={toggleTheme}
    >
      {page}
    </PageShell></CmsContext.Provider>
  )
}
