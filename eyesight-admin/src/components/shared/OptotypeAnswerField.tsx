/**
 * Single-character optotype answer input with IME / focus-leak hardening.
 * Used by exam TestStep and Far Acuity exercise.
 */
import React, { useRef } from 'react';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import {
  OPTOTYPE_LATIN_INPUT_ATTRS,
  createOptotypeFocusLeakGuard,
  toOptotypeInputChar,
  type OptotypeFocusLeakGuard,
} from 'src/utils/optotypeInput';

export type OptotypeAnswerFieldProps = {
  absoluteIndex: number;
  batchLocalIndex: number;
  value: string;
  label: string;
  ariaLabel: string;
  disabled?: boolean;
  numbersOnly?: boolean;
  /** Narrow layout (far-acuity bar) vs wider exam labels */
  narrow?: boolean;
  leakGuard: OptotypeFocusLeakGuard;
  inputRefs: React.MutableRefObject<Array<HTMLInputElement | null>>;
  confirmButtonRef?: React.RefObject<HTMLButtonElement | null>;
  firstInputRef?: React.MutableRefObject<HTMLInputElement | null>;
  onCommit: (absoluteIndex: number, value: string) => void;
};

/**
 * Shared guard factory for a batch of answer fields (one per TestStep mount).
 */
export function useOptotypeAnswerLeakGuard(): OptotypeFocusLeakGuard {
  const guardRef = useRef<OptotypeFocusLeakGuard | null>(null);
  if (!guardRef.current) {
    guardRef.current = createOptotypeFocusLeakGuard();
  }
  return guardRef.current;
}

const OptotypeAnswerField: React.FC<OptotypeAnswerFieldProps> = ({
  absoluteIndex,
  batchLocalIndex,
  value,
  label,
  ariaLabel,
  disabled = false,
  numbersOnly = false,
  narrow = false,
  leakGuard,
  inputRefs,
  confirmButtonRef,
  firstInputRef,
  onCommit,
}) => {
  /** Skip onChange that echoes a keydown we already handled. */
  const skipChangeRef = useRef(false);

  const focusNext = () => {
    window.setTimeout(() => {
      const nextInput = inputRefs.current[batchLocalIndex + 1];
      if (nextInput) {
        nextInput.focus();
        return;
      }
      confirmButtonRef?.current?.focus();
    }, 0);
  };

  const commit = (raw: string, options?: { fromKeyDown?: boolean }) => {
    if (disabled) return;
    const next = toOptotypeInputChar(raw, numbersOnly);
    if (next && leakGuard.shouldIgnore(absoluteIndex, next)) {
      return;
    }

    onCommit(absoluteIndex, next);

    if (options?.fromKeyDown) {
      skipChangeRef.current = true;
      window.setTimeout(() => {
        skipChangeRef.current = false;
      }, 0);
    }

    if (!next) return;

    leakGuard.armNextField(absoluteIndex + 1, next);
    focusNext();
  };

  return (
    <CustomTextField
      size="small"
      label={label}
      inputRef={(el: HTMLInputElement | null) => {
        inputRefs.current[batchLocalIndex] = el;
        if (batchLocalIndex === 0 && firstInputRef) {
          firstInputRef.current = el;
        }
      }}
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        if (skipChangeRef.current) return;
        const native = e.nativeEvent as InputEvent;
        if (native.isComposing) return;
        commit(e.target.value);
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
        if (disabled) return;

        if (e.nativeEvent.isComposing || e.key === 'Process' || e.key === 'Dead') {
          e.preventDefault();
          return;
        }

        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault();
          onCommit(absoluteIndex, '');
          if (!value && batchLocalIndex > 0) {
            window.setTimeout(() => inputRefs.current[batchLocalIndex - 1]?.focus(), 0);
          }
          return;
        }

        if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
        e.preventDefault();
        e.stopPropagation();
        commit(e.key, { fromKeyDown: true });
      }}
      onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        commit(e.clipboardData.getData('text') || '');
      }}
      onCompositionStart={(e: React.CompositionEvent<HTMLInputElement>) => {
        // Cancel IME composition without blur/focus thrash (that caused cross-field leaks).
        e.preventDefault();
      }}
      onCompositionEnd={(e: React.CompositionEvent<HTMLInputElement>) => {
        e.preventDefault();
        commit(e.data || e.currentTarget.value);
      }}
      disabled={disabled}
      inputProps={{
        ...OPTOTYPE_LATIN_INPUT_ATTRS,
        'aria-label': ariaLabel,
        style: { textAlign: 'center' },
      }}
      sx={{
        width: narrow ? 56 : undefined,
        minWidth: narrow ? 56 : 130,
        flex: '0 0 auto',
        '& .MuiOutlinedInput-input': {
          textAlign: 'center',
          px: 0.5,
        },
      }}
    />
  );
};

export default OptotypeAnswerField;
