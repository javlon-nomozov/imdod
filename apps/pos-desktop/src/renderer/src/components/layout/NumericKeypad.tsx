interface NumericKeypadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export function NumericKeypad({ onDigit, onBackspace }: NumericKeypadProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((key) => {
        if (key === '') return <div key="spacer" />;
        if (key === '⌫') {
          return (
            <button
              key={key}
              type="button"
              onClick={onBackspace}
              className="rounded-lg bg-slate-200 py-4 text-xl font-medium text-slate-700 active:bg-slate-300"
            >
              ⌫
            </button>
          );
        }
        return (
          <button
            key={key}
            type="button"
            onClick={() => onDigit(key)}
            className="rounded-lg bg-white py-4 text-xl font-medium text-slate-900 shadow active:bg-slate-100"
          >
            {key}
          </button>
        );
      })}
    </div>
  );
}
