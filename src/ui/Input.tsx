import {
  forwardRef,
  useId,
  cloneElement,
  isValidElement,
  Children,
  type InputHTMLAttributes,
  type ReactNode,
  type ReactElement,
} from 'react';
import styles from './Input.module.css';

/**
 * Input + FormField Primitives
 *
 * <FormField label="E-posta" hint="..." error="..." required>
 *   <Input type="email" />
 * </FormField>
 *
 * Otomatik aria-* bağları:
 *  - label htmlFor ↔ input id
 *  - aria-describedby ↔ hint/error
 *  - aria-invalid ↔ error varlığı
 *
 * FormField çocuk Input'a id ve aria-describedby ekler (cloneElement ile).
 * Bu, kullanıcı kodunda manuel prop drilling olmadan a11y-compliant bağ kurar.
 */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ iconLeft, iconRight, invalid, className = '', ...rest }, ref) => {
    const classes = [
      styles.inputWrap,
      invalid ? styles.invalid : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={classes}>
        {iconLeft && (
          <span className={styles.iconLeft} aria-hidden="true">
            {iconLeft}
          </span>
        )}
        <input
          ref={ref}
          className={styles.input}
          aria-invalid={invalid || undefined}
          {...rest}
        />
        {iconRight && (
          <span className={styles.iconRight} aria-hidden="true">
            {iconRight}
          </span>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

interface FormFieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

/**
 * FormField — label, input, hint, error'ı semantic olarak bağlar.
 *
 * Tek bir <Input /> children bekler. cloneElement ile id ve
 * aria-describedby ekler — kullanıcı manuel id geçmek zorunda kalmaz.
 */
export function FormField({
  label,
  hint,
  error,
  required = false,
  children,
}: FormFieldProps) {
  const fieldId = useId();
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  // Tek Input children'ı clone ile zenginleştir
  const child = Children.only(children);
  const enhancedChild = isValidElement(child)
    ? cloneElement(child as ReactElement<InputProps>, {
        id: fieldId,
        'aria-describedby': describedBy,
        invalid: !!error || (child.props as InputProps).invalid,
      } as Partial<InputProps>)
    : child;

  return (
    <div className={styles.field}>
      <label htmlFor={fieldId} className={styles.label}>
        {label}
        {required && (
          <span className={styles.required} aria-label="zorunlu">
            *
          </span>
        )}
      </label>
      {enhancedChild}
      {hint && !error && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
