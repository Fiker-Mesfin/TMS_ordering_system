import { Link } from "@tanstack/react-router";
import { Button } from "@/shared/ui/button";
import hero from "@/assets/hero.jpg";

const steps = [
  {
    number: "01",
    title: "Choose your meal",
    description:
      "Browse the menu, choose your burgers, pick any extras, and add them to your cart.",
  },
  {
    number: "02",
    title: "Choose a preorder time",
    description:
      "Select an available weekday and meal time. Available dates and slots can change as orders fill.",
  },
  {
    number: "03",
    title: "Tell us where to meet you",
    description:
      "Enter your name and phone number, choose your AAU campus, and select a delivery meeting point.",
  },
  {
    number: "04",
    title: "Place your order",
    description:
      "Review your order and total, then place it. Your order is saved but is not confirmed yet.",
  },
  {
    number: "05",
    title: "Pay and send proof",
    description:
      "Transfer the exact total using the CBE or Telebirr details shown on your order page. Enter the transaction reference; you can also attach a receipt.",
  },
  {
    number: "06",
    title: "We verify and confirm",
    description:
      "After we verify your payment, your order is confirmed for the date and meal time you selected. Follow its progress from My Orders.",
  },
];

export function AboutPage() {
  return (
    <div>
      <section className="bg-background">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-[1fr_minmax(0,420px)] md:py-20">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-full border border-primary/30 bg-background/90 px-4 py-2 text-sm font-bold uppercase tracking-[0.2em] text-primary shadow-md backdrop-blur-sm">
              TMS Burger · Addis Ababa
            </p>
            <h1 className="mt-6 font-sans text-4xl font-bold leading-tight tracking-tight normal-case text-foreground sm:text-6xl">
              Fresh burgers, <span className="text-primary">made for your campus.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg font-medium text-foreground sm:text-xl">
              ጥራት በተመጣጣኝ ዋጋ፣ ጣዕም በየካምፓሱ!
            </p>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-foreground/85 sm:text-lg">
              Quality at an affordable price, flavor on every campus. We make campus preorders
              simple and deliver free to AAU campuses in Addis Ababa.
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

      <section className="border-y border-border bg-card/60">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
              Made with care
            </p>
            <h2 className="mt-2 font-sans text-3xl font-bold tracking-tight normal-case text-foreground sm:text-4xl">
              Fresh ingredients. A better burger.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-foreground/85 sm:text-lg">
              Good flavor starts before the first bite. We make our burger bread from scratch, use
              fresh meat sourced from supermarkets, and prepare our chips with fresh oil. Our sauces
              bring the whole burger together.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <article className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-display text-xl uppercase tracking-wide text-primary">
                Bread made from scratch
              </h3>
              <p className="mt-2 text-base leading-relaxed text-foreground/85">
                We make our burger bread ourselves for a soft, satisfying base in every burger.
              </p>
            </article>
            <article className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-display text-xl uppercase tracking-wide text-primary">
                Freshly sourced meat
              </h3>
              <p className="mt-2 text-base leading-relaxed text-foreground/85">
                We source fresh meat from supermarkets and build our burgers around its flavor.
              </p>
            </article>
            <article className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-display text-xl uppercase tracking-wide text-primary">
                Fresh chips and sauces
              </h3>
              <p className="mt-2 text-base leading-relaxed text-foreground/85">
                We prepare our chips with fresh oil and serve them with sauces selected to make
                every bite even better.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Your order</p>
          <h2 className="mt-2 font-sans text-3xl font-bold tracking-tight normal-case text-foreground sm:text-4xl">
            From your cart to your campus
          </h2>
          <p className="mt-3 text-base leading-relaxed text-foreground/85 sm:text-lg">
            Here is what happens after you choose your meal. Your order is a preorder: we schedule
            it for an available delivery day and meal time.
          </p>
        </div>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step) => (
            <li key={step.number} className="rounded-xl border border-border bg-card p-5 sm:p-6">
              <span className="font-display text-3xl text-primary">{step.number}</span>
              <h3 className="mt-2 font-display text-xl uppercase tracking-wide text-primary">
                {step.title}
              </h3>
              <p className="mt-2 text-base leading-relaxed text-foreground/85">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
        <p className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-4 text-base leading-relaxed text-foreground">
          <strong>Important:</strong> placing an order does not confirm it. Your order is confirmed
          only after your payment has been verified.
        </p>
      </section>

      <section className="border-y border-border bg-card/60">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:grid-cols-2 sm:py-16">
          <article className="rounded-xl border border-border bg-card p-6 sm:p-7">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Preorders</p>
            <h2 className="mt-2 font-display text-2xl uppercase tracking-wide text-primary sm:text-3xl">
              Pick a day and meal time
            </h2>
            <ul className="mt-4 list-disc space-y-3 pl-5 text-base leading-relaxed text-foreground/85 sm:text-lg">
              <li>
                Choose from the next two available weekdays; delivery is not available on weekends.
              </li>
              <li>Available dates and meal times depend on current availability.</li>
              <li>Delivery is free to the AAU campuses listed at checkout.</li>
              <li>Use the phone number you can answer so we can coordinate your delivery.</li>
            </ul>
          </article>

          <article className="rounded-xl border border-border bg-card p-6 sm:p-7">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Payment</p>
            <h2 className="mt-2 font-display text-2xl uppercase tracking-wide text-primary sm:text-3xl">
              Pay by CBE or Telebirr
            </h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-base leading-relaxed text-foreground/85 sm:text-lg">
              <li>Open your order and use the payment details shown there.</li>
              <li>Transfer the exact order total and keep your transaction reference.</li>
              <li>
                Submit the reference on the order page. You may attach your payment receipt too.
              </li>
              <li>We review the submitted proof and update your order when it is verified.</li>
            </ol>
            <p className="mt-4 text-base font-semibold leading-relaxed text-foreground">
              Please wait for verification before considering your order confirmed.
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
        <div className="grid gap-6 md:grid-cols-2">
          <article className="rounded-xl border border-border bg-card p-6 sm:p-7">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
              Need to change plans?
            </p>
            <h2 className="mt-2 font-display text-2xl uppercase tracking-wide text-primary sm:text-3xl">
              When can I change my delivery date?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-foreground/85 sm:text-lg">
              After your payment is verified, open your order and use{" "}
              <strong>Change delivery date</strong>. You can move delivery forward by up to two
              weekdays, choosing from dates that are open. Changes close at 11:00 AM Addis Ababa
              time on the day before your scheduled delivery.
            </p>
            <p className="mt-3 text-base leading-relaxed text-foreground/85 sm:text-lg">
              Before you submit payment proof, you can cancel an unpaid order from its order page.
              Once payment proof is submitted, direct cancellation is unavailable—please contact us
              if you need help.
            </p>
          </article>

          <article className="rounded-xl border border-border bg-card p-6 sm:p-7">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Refunds</p>
            <h2 className="mt-2 font-display text-2xl uppercase tracking-wide text-primary sm:text-3xl">
              If a payment is rejected
            </h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-base leading-relaxed text-foreground/85 sm:text-lg">
              <li>
                Read the review note on your order page and request a refund if you already
                transferred money.
              </li>
              <li>
                Choose CBE or Telebirr, enter your account or phone number, and send the request for
                review.
              </li>
              <li>
                After approval, the refund is sent manually. Its transaction reference and proof
                appear on your order.
              </li>
              <li>
                If it has not arrived, report that from the order page and wait for the review
                before choosing what happens next.
              </li>
              <li>
                After confirming receipt, choose to continue the order with a new payment or close
                it and place a new order.
              </li>
            </ol>
            <p className="mt-4 text-base leading-relaxed text-foreground/85 sm:text-lg">
              If your payment is rejected, read the review note and correct your proof if needed. If
              you already transferred money and it cannot be confirmed, you can request a refund. An
              open refund request pauses payment submission until it is reviewed.
            </p>
          </article>
        </div>
      </section>

      <section className="bg-primary/10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 px-4 py-10 sm:flex-row sm:items-center sm:py-12">
          <div>
            <h2 className="font-sans text-2xl font-bold tracking-tight normal-case text-foreground sm:text-3xl">
              Ready for a fresh burger?
            </h2>
            <p className="mt-2 text-base leading-relaxed text-foreground/85 sm:text-lg">
              Explore the menu and choose your next campus meal.
            </p>
            <p className="mt-2 text-base text-foreground/85">
              Questions? Call{" "}
              <a
                className="font-semibold text-foreground underline underline-offset-4"
                href="tel:0909841353"
              >
                0909841353
              </a>{" "}
              or message us on{" "}
              <a
                className="font-semibold text-foreground underline underline-offset-4"
                href="https://t.me/TMS_BG"
                target="_blank"
                rel="noopener noreferrer"
              >
                Telegram
              </a>
              .
            </p>
          </div>
          <Button asChild size="lg" className="bg-flame shadow-flame">
            <Link to="/">Order from the menu</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
