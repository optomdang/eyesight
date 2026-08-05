/**
 * Single-character optotype answer input.
 *
 * Design rules (clinical acuity entry):
 * 1. Native text insertion is always blocked (beforeInput preventDefault).
 * 2. keydown + beforeInput for the same gesture collapse to one commit.
 * 3. After advance, the next field ignores only the leaked previous character briefly.
 * 4. Fast typing that lands on an already-filled box is forwarded to the next box.
 * 5. onChange never drives state (controlled value only from parent).
 */
import React from 'react';
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
  narrow?: boolean;
  leakGuard: OptotypeFocusLeakGuard;
  inputRefs: React.MutableRefObject<Array<HTMLInputElement | null>>;
  confirmButtonRef?: React.RefObject<HTMLButtonElement | null>;
  firstInputRef?: React.MutableRefObject<HTMLInputElement | null>;
  onCommit: (absoluteIndex: number, value: string) => void;
};

export function useOptotypeAnswerLeakGuard(): OptotypeFocusLeakGuard {
  const guardRef = React.useRef<OptotypeFocusLeakGuard | null>(null);
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
  const focusAfter = (localIndex: number) => {
    window.setTimeout(() => {
      const nextInput = inputRefs.current[localIndex + 1];
      if (nextInput) {
        nextInput.focus();
        return;
      }
      confirmButtonRef?.current?.focus();
    }, 0);
  };

  const focusPrev = () => {
    window.setTimeout(() => {
      if (batchLocalIndex > 0) {
        inputRefs.current[batchLocalIndex - 1]?.focus();
      }
    }, 0);
  };

  const commitChar = (raw: string) => {
    if (disabled) return;

    const next = toOptotypeInputChar(raw, numbersOnly);
    if (!next) return;

    // Start from this field; if already filled, prefer the next empty slot.
    let preferredIndex = absoluteIndex;
    if (value) {
      if (!inputRefs.current[batchLocalIndex + 1]) return;
      preferredIndex = absoluteIndex + 1;
    }

    if (leakGuard.shouldIgnore(preferredIndex, next)) return;

    const decision = leakGuard.decideCommit(preferredIndex, next);
    if (decision.action === 'duplicate') return;

    const targetIndex = decision.index;
    const targetLocal = batchLocalIndex + (targetIndex - absoluteIndex);
    if (targetLocal < 0 || !inputRefs.current[targetLocal]) return;
    if (leakGuard.shouldIgnore(targetIndex, next)) return;

    onCommit(targetIndex, next);
    leakGuard.armNextField(targetIndex + 1, next);
    focusAfter(targetLocal);
  };

  const clearChar = () => {
    if (disabled) return;
    onCommit(absoluteIndex, '');
    if (!value) {
      focusPrev();
    }
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
      // Controlled only — never let native change events mutate answers / advance focus.
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
        if (disabled) return;

        // Block IME composition keys; characters arrive via beforeInput instead.
        if (e.nativeEvent.isComposing || e.key === 'Process' || e.key === 'Dead') {
          e.preventDefault();
          return;
        }

        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault();
          e.stopPropagation();
          clearChar();
          return;
        }

        if (e.key === 'Tab' || e.key === 'Enter') return;

        // Printable key: handle here on desktop. beforeInput is also prevented so
        // decideCommit collapses the duplicate gesture into one commit.
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          e.stopPropagation();
          commitChar(e.key);
        }
      }}
      onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        commitChar(e.clipboardData.getData('text') || '');
      }}
      onCompositionStart={(e: React.CompositionEvent<HTMLInputElement>) => {
        e.preventDefault();
      }}
      onCompositionUpdate={(e: React.CompositionEvent<HTMLInputElement>) => {
        e.preventDefault();
      }}
      onCompositionEnd={(e: React.CompositionEvent<HTMLInputElement>) => {
        e.preventDefault();
        // Do not commit here — keydown/beforeInput already own the gesture.
      }}
      disabled={disabled}
      inputProps={{
        ...OPTOTYPE_LATIN_INPUT_ATTRS,
        'aria-label': ariaLabel,
        style: { textAlign: 'center' },
        enterKeyHint: 'next',
        onBeforeInput: (e: InputEvent) => {
          e.preventDefault();
          if (disabled) return;
          if (e.inputType?.startsWith('delete')) {
            clearChar();
            return;
          }
          if (
            (e.inputType === 'insertText' || e.inputType === 'insertCompositionText') &&
            e.data
          ) {
            commitChar(e.data);
          }
        },
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
