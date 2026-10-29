import { Link } from "@tanstack/react-router";
import { Button } from "@/shared/ui/button";
import hero from "@/assets/hero.jpg";

export function AboutPage() {
  return (
    <div>
      <section className="bg-background">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-[1fr_minmax(0,420px)] md:py-20">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-full border border-primary/30 bg-background/90 px-4 py-2 text-sm font-bold uppercase tracking-[0.2em] text-primary shadow-md backdrop-blur-sm">
              TMS Burger · Addis Ababa
            </p>
            <h1 className="mt-6 text-4xl leading-tight sm:text-6xl">
              TMS BURGER — <span className="text-primary">ጥራት በተመጣጣኝ ዋጋ፣ ጣዕም በየካምፓሱ!</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-foreground sm:text-lg">
              Quality at an affordable price, flavor on every campus.
            </p>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              TMS Burger brings delicious burgers and convenient delivery to AAU campuses in Addis
              Ababa—with free campus delivery.
            </p>
            <Button asChild size="lg" className="mt-8 bg-flame shadow-flame">
              <Link to="/">Explore the menu</Link>
            </Button>
          </div>
          <img
            src={hero}
            alt="TMS burger prepared over open flames"
            className="h-64 w-full rounded-2xl object-cover shadow-flame sm:h-80 md:h-[360px]"
            width={1600}
            height={912}
          />
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-4xl sm:text-5xl">Good burgers, right on campus</h2>
            <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
              Choose your burger, add your favorite extras, and select a delivery date and meal
              time. Place your order online and follow its progress from your order page.
            </p>
          </div>
          <aside className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-2xl">How ordering works</h2>
            <ol className="mt-3 list-inside list-decimal space-y-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              <li>Choose your burgers and select a delivery date and meal time.</li>
              <li>
                Place your order, then transfer the total using one of the listed payment methods.
              </li>
              <li>Submit your transaction reference and optional receipt on the order page.</li>
              <li>
                We verify your payment and confirm your order. Your burgers are scheduled for your
                selected delivery time.
              </li>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              Your order is not confirmed until the payment has been verified.
            </p>
          </aside>
        </div>
      </section>
    </div>
  );
}
