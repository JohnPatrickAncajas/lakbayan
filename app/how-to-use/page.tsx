import { Navigation } from "@/components/navigation"
import { MapPin, Search, Route, Users, CheckCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"

export default function HowToUsePage() {
  const steps = [
    {
      icon: MapPin,
      title: "Select Your Points",
      description:
        "Click or tap on the map to set your starting point (A) and destination (B). You can also use the search bar to type in locations.",
      color: "bg-primary",
    },
    {
      icon: Search,
      title: "View Available Routes",
      description:
        "Browse through available routes with fares, estimated time, and distance. Each route shows real commuter data from our community.",
      color: "bg-chart-2",
    },
    {
      icon: Route,
      title: "Choose Your Route",
      description:
        "Select your preferred route to see detailed step-by-step directions, including transfers and landmarks along the way.",
      color: "bg-chart-4",
    },
    {
      icon: Users,
      title: "Contribute & Help",
      description:
        "Share your knowledge! Add new routes, verify existing ones, or report issues to help fellow commuters find better paths.",
      color: "bg-chart-5",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-16">
        {/* Hero Section */}
        <section className="py-16 px-4 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
              Paano Gamitin ang Lakbayan?
            </h1>
            <p className="text-lg text-muted-foreground mb-8 text-pretty">
              Simple lang! Follow these easy steps to start your journey with our community-powered transport guide.
            </p>
          </div>
        </section>

        {/* Steps Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="space-y-12">
              {steps.map((step, index) => {
                const Icon = step.icon
                const isEven = index % 2 === 0

                return (
                  <div
                    key={index}
                    className={`flex flex-col ${isEven ? "md:flex-row" : "md:flex-row-reverse"} gap-8 items-center`}
                  >
                    {/* Icon Card */}
                    <div className="flex-shrink-0">
                      <Card className="p-8 relative">
                        <div className={`w-20 h-20 ${step.color} rounded-2xl flex items-center justify-center mb-4`}>
                          <Icon className="w-10 h-10 text-white" />
                        </div>
                        <div className="absolute -top-4 -left-4 w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg border-4 border-background">
                          <span className="text-xl font-bold text-primary-foreground">{index + 1}</span>
                        </div>
                      </Card>
                    </div>

                    {/* Content */}
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="text-2xl font-bold text-foreground mb-3">{step.title}</h3>
                      <p className="text-muted-foreground leading-relaxed text-pretty">{step.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Tips Section */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Helpful Tips</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Verify Routes</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Help keep information accurate by verifying routes youve personally taken. Your input matters!
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Check Multiple Routes</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Compare different routes to find the fastest, cheapest, or most convenient option for your trip.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Share New Routes</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Know a route thats not listed? Add it! Your local knowledge helps the entire community.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Report Issues</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Found outdated info? Let us know! Report fare changes, route updates, or any issues you encounter.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Start?</h2>
            <p className="text-muted-foreground mb-8 text-pretty">
              Join thousands of commuters helping each other find better routes every day.
            </p>
            <Link href="/">
              <Button size="lg" className="gap-2">
                Start Exploring
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-6">Tulungan natin ang iba makauwi</p>
          </div>
        </section>
      </main>
    </div>
  )
}
