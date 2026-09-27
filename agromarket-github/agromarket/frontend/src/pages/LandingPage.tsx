import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  HandCoins,
  Leaf,
  ShieldCheck,
  Sprout,
  Store,
  Truck,
  Users,
} from "lucide-react";
import { useState } from "react";

const features = [
  { icon: <Users size={20} />, title: "Bulk Aggregation", text: "Small farms combine into single tradable lots so no harvest is too small to sell." },
  { icon: <ShieldCheck size={20} />, title: "Verified Produce", text: "Village coordinators physically verify weight and quality before a lot is listed." },
  { icon: <HandCoins size={20} />, title: "Transparent Pricing", text: "Farmer price, transport and platform fee are broken down on every transaction." },
  { icon: <Truck size={20} />, title: "Driver Network", text: "Registered transporters with suitable vehicles match to each delivery." },
  { icon: <BarChart3 size={20} />, title: "Price Trends", text: "Weekly price history and clearly-labelled estimates help decide when to sell." },
  { icon: <Store size={20} />, title: "Direct Orders", text: "Buyers order exact quantities from verified lots without intermediary chains." },
];

const faqs = [
  { q: "Who verifies the produce?", a: "Village coordinators inspect each listing, record the verified weight and upload a photo. Only verified produce enters bulk lots." },
  { q: "How is the price I see built up?", a: "Buyer price = farmer price + transportation cost + platform fee. The full breakdown is shown before you order and on every payment record." },
  { q: "Is my payment real on this prototype?", a: "No. This is a demonstration prototype — payment flows are clearly labelled as simulated and no money moves." },
  { q: "What if my harvest is only 50 kg?", a: "Your listing is combined with nearby farmers growing the same crop into a bulk lot of 200 kg or more, so you still reach bulk buyers." },
  { q: "Are the price forecasts real market prices?", a: "No. Forecasts are statistical estimates on sample data and are always labelled as estimates, never as real market prices." },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 font-semibold text-primary-dark">
            <Leaf size={22} className="text-primary" /> AgroMarket
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-ink-soft ml-4">
            <a href="#how-it-works" className="hover:text-ink">How It Works</a>
            <a href="#features" className="hover:text-ink">Marketplace</a>
            <a href="#benefits" className="hover:text-ink">About</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/login" className="btn-ghost">Login</Link>
            <Link to="/register" className="btn-primary">Get Started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-16 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <span className="badge-green mb-4">Direct farm-to-buyer trade</span>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight text-primary-dark">
            From Farm to Buyer.
            <br />
            A More Direct Agricultural Marketplace.
          </h1>
          <p className="mt-4 text-lg text-ink-soft max-w-xl">
            Connect farmers, buyers, and transportation providers through verified produce listings, bulk
            aggregation, and coordinated delivery.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/register" className="btn-primary">Get Started</Link>
            <Link to="/login" className="btn-secondary">Explore Marketplace</Link>
          </div>
          <p className="mt-4 text-xs text-ink-soft">
            Prototype demonstration with sample data. Payments are simulated.
          </p>
        </div>

        {/* Illustration: Farmer -> Marketplace -> Buyer */}
        <div className="card p-8">
          <div className="flex items-center justify-between gap-2">
            <FlowNode icon={<Sprout size={26} />} label="Farmer" sub="Lists produce" />
            <Arrow className="text-primary-accent" />
            <FlowNode icon={<Store size={26} />} label="Marketplace" sub="Verified bulk lots" highlight />
            <Arrow className="text-primary-accent" />
            <FlowNode icon={<Truck size={26} />} label="Buyer" sub="Orders & receives" />
          </div>
          <div className="mt-6 border-t border-line pt-4 space-y-2.5 text-sm">
            <Row label="Farmer price" value="₹26 / kg" />
            <Row label="Transportation" value="₹3 / kg" />
            <Row label="Platform fee" value="₹2 / kg" />
            <div className="border-t border-line pt-2 flex justify-between font-semibold text-primary-dark">
              <span>Buyer price</span>
              <span>₹31 / kg</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-ink-soft">Every rupee is accounted for — full price transparency ledger.</p>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-white border-y border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <h2 className="text-2xl font-bold text-primary-dark">How the Platform Works</h2>
          <p className="mt-2 text-ink-soft max-w-2xl">Four simple steps from harvest to payment.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-4">
            {[
              ["1", "List & Verify", "Farmers list produce; village coordinators physically verify weight and quality."],
              ["2", "Aggregate", "Verified listings near each other combine into bulk lots of 200 kg or more."],
              ["3", "Order & Match", "Buyers order exact quantities; the system recommends a suitable driver."],
              ["4", "Deliver & Pay", "Driver completes the delivery; payments show the full transparent breakdown."],
            ].map(([n, t, d]) => (
              <div key={n} className="card p-6">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white font-semibold">{n}</span>
                <h3 className="mt-3 font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-ink-soft">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-2xl font-bold text-primary-dark">Key Features</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card p-6">
              <div className="h-10 w-10 rounded-lg bg-primary-accent/15 text-primary flex items-center justify-center">{f.icon}</div>
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="bg-white border-y border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid md:grid-cols-2 gap-6">
          <div className="card p-7">
            <h3 className="text-lg font-semibold text-primary-dark flex items-center gap-2"><Sprout size={20} /> Benefits for Farmers</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-ink-soft list-disc pl-5">
              <li>Sell small harvests by joining bulk lots with nearby farmers</li>
              <li>Verified-weight listings build buyer trust and fair pricing</li>
              <li>Price trend estimates help pick the right week to sell</li>
              <li>Transparent ledger shows exactly what you earn per kg</li>
            </ul>
          </div>
          <div className="card p-7">
            <h3 className="text-lg font-semibold text-primary-dark flex items-center gap-2"><Store size={20} /> Benefits for Buyers</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-ink-soft list-disc pl-5">
              <li>Verified, aggregated lots reduce sourcing effort</li>
              <li>Know every cost component before ordering</li>
              <li>Coordinated pickup and delivery tracking</li>
              <li>Trust scores on farmers and transporters</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Transportation network */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="card p-8 flex flex-col md:flex-row md:items-center gap-6">
          <div className="h-12 w-12 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
            <Truck size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-primary-dark">Transportation Network</h3>
            <p className="mt-1 text-sm text-ink-soft max-w-3xl">
              Registered drivers with mini trucks, pickups, tempos and tractors serve their local areas. The platform
              filters by vehicle capacity, service area and route, then recommends the best match for every delivery.
            </p>
          </div>
          <div className="md:ml-auto grid grid-cols-3 gap-4 text-center shrink-0">
            <Stat value="3+" label="Vehicle types" />
            <Stat value="200 kg" label="Lot threshold" />
            <Stat value="100%" label="Price transparency" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white border-t border-line">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
          <h2 className="text-2xl font-bold text-primary-dark text-center">Frequently Asked Questions</h2>
          <div className="mt-8 space-y-3">
            {faqs.map((f, i) => (
              <div key={i} className="card overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left font-medium"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  {f.q}
                  <ChevronDown size={18} className={`transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && <p className="px-5 pb-4 text-sm text-ink-soft">{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-primary-dark text-white/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="flex items-center gap-2"><Leaf size={16} className="text-primary-accent" /> AgroMarket — prototype</span>
          <span>Demonstration data · Simulated payments · Estimates labelled</span>
        </div>
      </footer>
    </div>
  );
}

function FlowNode({ icon, label, sub, highlight }: { icon: React.ReactNode; label: string; sub: string; highlight?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1.5 rounded-xl px-3 py-4 w-28 ${highlight ? "bg-primary text-white" : "bg-canvas"}`}>
      {icon}
      <span className={`text-sm font-semibold ${highlight ? "text-white" : "text-ink"}`}>{label}</span>
      <span className={`text-[11px] text-center ${highlight ? "text-white/80" : "text-ink-soft"}`}>{sub}</span>
    </div>
  );
}

function Arrow({ className }: { className?: string }) {
  return <ArrowRight size={18} className={className} />;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-soft">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-xl font-bold text-primary">{value}</p>
      <p className="text-xs text-ink-soft">{label}</p>
    </div>
  );
}
