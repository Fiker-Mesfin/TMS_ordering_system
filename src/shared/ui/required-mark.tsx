export function RequiredMark() {
  return (
    <>
      <span className="text-[#ff1744]" aria-hidden="true">
        {" "}
        *
      </span>
      <span className="sr-only"> (required)</span>
    </>
  );
}
