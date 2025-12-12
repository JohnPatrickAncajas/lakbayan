"use client"

import { Navigation } from "@/components/navigation"
import { Map, Users, Heart, Bus, ArrowRight, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <main className="pt-16">
        <section className="relative py-20 px-4 overflow-hidden bg-slate-900 text-white">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1495571344521-39e9ce1558d4?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10"></div>
          <div className="relative container mx-auto max-w-5xl text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
              LakBayan
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 max-w-2xl mx-auto font-light leading-relaxed">
              Navigating the Philippines, one stop at a time. The first community-driven transit guide designed for the Filipino commuter.
            </p>
          </div>
        </section>

        <section className="py-16 px-4 bg-white">
          <div className="container mx-auto max-w-5xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">Our Mission</h2>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Commuting in the Philippines can be chaotic. Routes change, terminals move, and accurate information is often hard to find.
                </p>
                <p className="text-slate-600 leading-relaxed mb-6">
                  LakBayan (a portmanteau of Lakbay meaning journey and Bayan meaning town/nation) aims to centralize this knowledge. By combining modern mapping technology with community contributions, we are building the most accurate database of Jeepney, Bus, Tricycle, and Train routes in the country.
                </p>
                <div className="flex gap-4">
                  <Link href="/">
                    <Button className="bg-slate-900 text-white hover:bg-slate-800">
                      Start Exploring <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                  <Map className="w-8 h-8 text-blue-600 mb-3" />
                  <h3 className="font-semibold text-slate-900">Accurate Maps</h3>
                  <p className="text-sm text-slate-500 mt-2">Detailed routes including local PUVs estimating fares and travel times.</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                  <Users className="w-8 h-8 text-green-600 mb-3" />
                  <h3 className="font-semibold text-slate-900">Community Driven</h3>
                  <p className="text-sm text-slate-500 mt-2">Powered by commuters who know the streets best.</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                  <Bus className="w-8 h-8 text-amber-600 mb-3" />
                  <h3 className="font-semibold text-slate-900">All Modes</h3>
                  <p className="text-sm text-slate-500 mt-2">From MRTs to Tricycles, we cover every way to move.</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                  <ShieldCheck className="w-8 h-8 text-indigo-600 mb-3" />
                  <h3 className="font-semibold text-slate-900">Verified Data</h3>
                  <p className="text-sm text-slate-500 mt-2">Contributions are vetted to ensure reliability.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-slate-50 border-t border-slate-200">
          <div className="container mx-auto max-w-4xl text-center">
            <Heart className="w-12 h-12 text-red-500 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Join the Community</h2>
            <p className="text-slate-600 mb-8 max-w-xl mx-auto">
              Know a terminal that isnt on the map? Or a new Jeepney route in your barangay? Sign up and contribute to help thousands of daily commuters.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/auth">
                <Button variant="outline" className="border-slate-300 hover:bg-slate-100">
                  Create Account
                </Button>
              </Link>
              <Link href="/auth">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  Contribute Now
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <footer className="py-8 bg-slate-900 text-slate-400 text-sm text-center">
          <div className="container mx-auto px-4">
            <p>&copy; {new Date().getFullYear()} LakBayan. Made with <Heart className="w-3 h-3 inline text-red-500" /> for the Philippines.</p>
          </div>
        </footer>
      </main>
    </div>
  )
}