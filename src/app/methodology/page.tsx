export default function MethodologyPage() {
  return (
    <article className="max-w-2xl space-y-6 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Methodology
        </h1>
        <p className="mt-3">
          This site estimates Sri Lanka fuel prices by approximating the Ceylon
          Petroleum Corporation&apos;s (CPC) cost-reflective pricing formula,
          introduced in November 2022, and projecting it forward using recent
          trends in global crude oil prices and the USD/LKR exchange rate.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          How a prediction is built
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>
            Fit a short-term linear trend (last 21 days) to daily Brent crude
            oil prices and the daily USD/LKR indicative exchange rate.
          </li>
          <li>Project both trends forward to the target date.</li>
          <li>
            Feed the projected crude price and exchange rate into the pricing
            formula, along with versioned tax and margin constants (VAT,
            excise duty, port handling, distribution and dealer margins), to
            produce a predicted retail price per litre.
          </li>
          <li>
            Compute a confidence range from trend-fit uncertainty plus a
            fixed margin for the formula&apos;s own approximation error.
          </li>
        </ol>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Important limitations
        </h2>
        <ul className="mt-3 list-disc space-y-3 pl-5">
          <li>
            <strong className="text-zinc-900 dark:text-zinc-100">
              CPC has never published a single authoritative equation.
            </strong>{" "}
            The formula structure and tax/margin figures used here are
            reconstructed from public reporting (Verite Research, Daily FT,
            EconomyNext) and, where unconfirmed, calibrated against real
            observed retail prices. CPC&apos;s own officials have given
            inconsistent public statements about whether a fixed formula is
            even being followed day to day.
          </li>
          <li>
            <strong className="text-zinc-900 dark:text-zinc-100">
              No fixed revision schedule.
            </strong>{" "}
            Prices used to be revised monthly; as of 2026 revisions happen at
            irregular intervals driven by global price volatility. This site
            cannot predict <em>when</em> the next revision will happen, only
            what the formula would imply if a revision happened on the
            target date.
          </li>
          <li>
            <strong className="text-zinc-900 dark:text-zinc-100">
              The government can override the formula.
            </strong>{" "}
            Ad hoc fuel subsidies have been used to keep pump prices below
            what the formula would otherwise imply.
          </li>
          <li>
            <strong className="text-zinc-900 dark:text-zinc-100">
              Crude oil input is a proxy.
            </strong>{" "}
            CPC&apos;s formula benchmarks Singapore Platts prices, which have
            no free public feed. This site uses Brent crude (EIA) as a
            correlated substitute.
          </li>
        </ul>
      </div>

      <p>
        In short: treat predictions as an informed estimate of the cost
        pressure on fuel prices, not a forecast of an official announcement.
      </p>
    </article>
  );
}
