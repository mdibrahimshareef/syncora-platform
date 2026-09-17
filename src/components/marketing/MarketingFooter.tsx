import Link from "next/link"
import dynamic from "next/dynamic"

const ParticleText = dynamic(() => import("./ParticleText").then(mod => mod.ParticleText), { 
  loading: () => <div className="w-full h-32 md:h-48 lg:h-64 relative flex justify-center items-center overflow-hidden my-4" />
})

const footerLinks = {
  Product: [
    { name: "Syncora Chat", href: "#" },
    { name: "Syncora Connect", href: "#" },
    { name: "Syncora Huddles", href: "#" },
    { name: "Syncora Canvas", href: "#" },
    { name: "Workflow Builder", href: "#" },
    { name: "Integrations", href: "#" },
    { name: "Enterprise Key Management", href: "#" },
    { name: "Pricing", href: "#" },
  ],
  Solutions: [
    { name: "Engineering", href: "/solutions/engineering" },
    { name: "IT Operations", href: "/solutions/it" },
    { name: "Customer Service", href: "/solutions/customer-service" },
    { name: "Sales", href: "/solutions/sales" },
    { name: "Project Management", href: "/solutions/project-management" },
    { name: "Marketing", href: "/solutions/marketing" },
    { name: "Human Resources", href: "/solutions/human-resources" },
    { name: "Security", href: "/solutions/security" },
  ],
  Resources: [
    { name: "Documentation", href: "#" },
    { name: "Syncora Community", href: "#" },
    { name: "Help Center", href: "#" },
    { name: "API Reference", href: "#" },
    { name: "Template Gallery", href: "#" },
    { name: "Webinars & Events", href: "#" },
    { name: "Blog", href: "#" },
    { name: "Podcast", href: "#" },
  ],
  Company: [
    { name: "About Us", href: "#" },
    { name: "Leadership", href: "#" },
    { name: "Investor Relations", href: "#" },
    { name: "Careers", href: "#" },
    { name: "Newsroom", href: "#" },
    { name: "Media Kit", href: "#" },
    { name: "Contact Sales", href: "#" },
    { name: "Trust & Security", href: "#" },
  ]
}

export function MarketingFooter() {
  return (
    <footer className="bg-background border-t border-border pt-12 pb-6">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Column 1: Logo and Company Links */}
          <div className="col-span-1">
            {/* The wrapper h-4 and mb-4 exactly matches the text-xs (h-4) and mb-4 of the other headings, ensuring perfect horizontal alignment */}
            <div className="h-4 mb-4 flex items-center">
              <Link href="/" className="inline-block">
                <div className="size-7 rounded-lg bg-primary flex items-center justify-center shadow-md">
                  <span className="text-primary-foreground font-extrabold text-sm leading-none">S</span>
                </div>
              </Link>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground font-medium">
              {footerLinks.Company.map(link => (
                <li key={link.name}>
                  <Link href={link.href} className="hover:text-primary transition-colors block py-1 md:py-0">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold tracking-wide uppercase text-xs mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground font-medium">
              {footerLinks.Product.map(link => (
                <li key={link.name}><Link href={link.href} className="hover:text-primary transition-colors">{link.name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-bold tracking-wide uppercase text-xs mb-4">Solutions</h4>
            <ul className="space-y-2 text-sm text-muted-foreground font-medium">
              {footerLinks.Solutions.map(link => (
                <li key={link.name}><Link href={link.href} className="hover:text-primary transition-colors">{link.name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-bold tracking-wide uppercase text-xs mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground font-medium">
              {footerLinks.Resources.map(link => (
                <li key={link.name}><Link href={link.href} className="hover:text-primary transition-colors">{link.name}</Link></li>
              ))}
            </ul>
          </div>
        </div>

        {/* Big SYNCORA Outline Text moved closer to bottom */}
        <div className="w-full mt-2 -mb-2">
          <ParticleText text="SYNCORA" />
        </div>

        <div className="border-t border-border pt-6 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-muted-foreground font-medium">
          <p>© {new Date().getFullYear()} SYNCORA Inc. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-primary transition-colors">Cookie Policy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Manage Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
