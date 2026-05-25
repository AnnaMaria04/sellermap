import Link from "next/link";
import { calculateAvailableToSell, createInitialStockStatus } from "@/lib/inventory/foundation";

const sampleAvailability = calculateAvailableToSell(
  createInitialStockStatus({
    physical: 128,
    reserved: 17,
    damaged: 4,
    expired: 2,
    inTransit: 23,
  }),
);

const productTracks = [
  {
    title: "Marketplace Intelligence",
    description: "Existing seller analysis flow for product checks, margin logic, and marketplace research.",
    href: "#marketplace",
    status: "Existing track preserved",
  },
  {
    title: "Inventory for Small Business",
    description: "New business-side foundation for products, suppliers, stock operations, analytics, and alerts.",
    href: "/inventory",
    status: "New main update",
  },
];

export default function HomePage() {
  return (
    <main className="shell">
      <nav className="topbar" aria-label="Primary navigation">
        <Link className="brand" href="/">
          SellerMap
        </Link>
        <div className="navLinks">
          <a href="#marketplace">Marketplace</a>
          <Link href="/inventory">Inventory</Link>
        </div>
      </nav>

      <section className="heroBand">
        <div className="heroCopy">
          <h1>SellerMap now has two product tracks in one codebase.</h1>
          <p>
            Marketplace work stays intact while the new business-side inventory layer becomes the next main
            update for small shops, cafes, hybrid sellers, and local production teams.
          </p>
          <div className="actions">
            <Link className="primaryAction" href="/inventory">
              Open inventory
            </Link>
            <a className="secondaryAction" href="#marketplace">
              View tracks
            </a>
          </div>
        </div>

        <div className="availabilityPanel" aria-label="Available to sell example">
          <span className="panelLabel">Core formula</span>
          <strong>{sampleAvailability.availableToSell}</strong>
          <p>available to sell from 128 physical units</p>
          <code>physical - reserved - damaged - expired - in_transit</code>
        </div>
      </section>

      <section id="marketplace" className="trackGrid" aria-label="Product tracks">
        {productTracks.map((track) => (
          <article className="trackCard" key={track.title}>
            <span>{track.status}</span>
            <h2>{track.title}</h2>
            <p>{track.description}</p>
            <Link href={track.href}>Continue</Link>
          </article>
        ))}
      </section>
    </main>
  );
}
