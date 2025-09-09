import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type TemperatureDialProps = {
    value: number;
    onChange: (value: number) => void | Promise<void>;
    min?: number;
    max?: number;
    step?: number;
    size?: number; // px
    ariaLabel?: string;
    className?: string;
};

/**
 * TemperatureDial
 * - 조나단 아이브 스타일의 미니멀 원형 다이얼
 * - 270° 스윕(-135° ~ 135°) 범위로 값 조정
 * - 중앙에 현재 값 표시 (소수 1자리)
 * - 마우스/터치 드래그, 키보드(←/→/↑/↓, PageUp/Down, Home/End) 지원
 */
const TemperatureDial: React.FC<TemperatureDialProps> = ({
    value,
    onChange,
    min = 0,
    max = 2,
    step = 0.1,
    size = 80,
    ariaLabel = 'Temperature',
    className = ''
}) => {
    // 내부 상태는 드래깅 중에만 임시 보정용으로 사용 (부드러운 반응), 외부 value를 소스로 유지
    const [dragging, setDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const clamped = useMemo(() => Math.min(max, Math.max(min, value)), [value, min, max]);
    const stepFixed = useCallback((v: number) => {
        const decimals = (step.toString().split('.')[1] || '').length;
        return parseFloat(v.toFixed(decimals));
    }, [step]);

    // 각도/값 변환 유틸
    const sweepDeg = 270; // usable sweep
    const startDeg = -135; // 시작 각도 (상단이 0deg 기준, 시계방향)

    const valueToDeg = useCallback((v: number) => {
        const t = (v - min) / (max - min); // 0..1
        return startDeg + t * sweepDeg;
    }, [min, max]);

    const degToValue = useCallback((deg: number) => {
        // -135..135 로 정규화
        let d = deg;
        // 범위를 -180..180으로 먼저 정규화
        d = ((d + 180) % 360 + 360) % 360 - 180;
        // 클램프
        d = Math.min(135, Math.max(-135, d));
        const t = (d - startDeg) / sweepDeg; // 0..1
        const val = min + t * (max - min);
        // 스텝 정렬
        const snapped = stepFixed(Math.round(val / step) * step);
        return Math.min(max, Math.max(min, snapped));
    }, [min, max, step, stepFixed]);

    // 포인터 좌표 -> 각도
    const posToDeg = useCallback((clientX: number, clientY: number) => {
        const el = containerRef.current;
        if (!el) return valueToDeg(clamped);
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = clientX - cx;
        const dy = clientY - cy;
        const rad = Math.atan2(dy, dx); // -PI..PI, 0deg: +X (오른쪽)
        const deg = (rad * 180) / Math.PI;
        return deg;
    }, [clamped, valueToDeg]);

    const beginDrag = useCallback((clientX: number, clientY: number) => {
        setDragging(true);
        const next = degToValue(posToDeg(clientX, clientY));
        onChange(next);
    }, [degToValue, posToDeg, onChange]);

    const onPointerMove = useCallback((e: PointerEvent | TouchEvent | MouseEvent) => {
        if (!dragging) return;
        if (e instanceof TouchEvent) {
            const t = e.touches[0] || e.changedTouches[0];
            if (t) onChange(degToValue(posToDeg(t.clientX, t.clientY)));
        } else if (e instanceof PointerEvent || e instanceof MouseEvent) {
            const any = e as PointerEvent | MouseEvent;
            onChange(degToValue(posToDeg(any.clientX, any.clientY)));
        }
    }, [dragging, degToValue, posToDeg, onChange]);

    const endDrag = useCallback(() => setDragging(false), []);

    useEffect(() => {
        if (!dragging) return;
        const move = (ev: any) => onPointerMove(ev);
        const up = () => endDrag();
        window.addEventListener('pointermove', move as any, { passive: true });
        window.addEventListener('mousemove', move as any, { passive: true });
        window.addEventListener('touchmove', move as any, { passive: true });
        window.addEventListener('pointerup', up);
        window.addEventListener('mouseup', up);
        window.addEventListener('touchend', up);
        window.addEventListener('touchcancel', up);
        return () => {
            window.removeEventListener('pointermove', move as any);
            window.removeEventListener('mousemove', move as any);
            window.removeEventListener('touchmove', move as any);
            window.removeEventListener('pointerup', up);
            window.removeEventListener('mouseup', up);
            window.removeEventListener('touchend', up);
            window.removeEventListener('touchcancel', up);
        };
    }, [dragging, onPointerMove, endDrag]);

    const onPointerDown = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
        e.preventDefault();
        if ('clientX' in e) {
            beginDrag((e as React.MouseEvent).clientX, (e as React.MouseEvent).clientY);
        } else if ('touches' in e && e.touches[0]) {
            const t = e.touches[0];
            beginDrag(t.clientX, t.clientY);
        }
    };

    // 키보드 제어
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        let next = clamped;
        const big = Math.max(step, (max - min) / 10);
        switch (e.key) {
            case 'ArrowUp':
            case 'ArrowRight':
                next = Math.min(max, clamped + step);
                break;
            case 'ArrowDown':
            case 'ArrowLeft':
                next = Math.max(min, clamped - step);
                break;
            case 'PageUp':
                next = Math.min(max, clamped + big);
                break;
            case 'PageDown':
                next = Math.max(min, clamped - big);
                break;
            case 'Home':
                next = min;
                break;
            case 'End':
                next = max;
                break;
            default:
                return;
        }
        e.preventDefault();
        onChange(stepFixed(next));
    };

    // SVG 설정
    const s = size;
    const stroke = Math.max(6, Math.round(s * 0.1));
    const r = (s - stroke) / 2;
    const center = s / 2;
    const circumference = 2 * Math.PI * r;
    const arcRatio = sweepDeg / 360; // 270/360
    const arcLength = circumference * arcRatio;
    const t = (clamped - min) / (max - min);
    const progress = arcLength * t;

    // 진행 stroke-dasharray: [progress, remaining, gap for the rest of circle]
    const dashArray = `${progress} ${arcLength - progress} ${circumference}`;

    // 시각적 포커스 핸들
    const [hasFocus, setHasFocus] = useState(false);

    return (
        <div
            ref={containerRef}
            className={`temperature-dial ${className}`}
            role="slider"
            aria-label={ariaLabel}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={Number.isFinite(clamped) ? clamped : 0}
            aria-valuetext={`${clamped.toFixed(1)}`}
            aria-orientation="horizontal"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onFocus={() => setHasFocus(true)}
            onBlur={() => setHasFocus(false)}
            onMouseDown={onPointerDown}
            onTouchStart={onPointerDown}
            onWheel={(e) => {
                e.preventDefault();
                const big = Math.max(step, (max - min) / 10);
                const delta = e.deltaY < 0 ? 1 : -1;
                const inc = e.shiftKey ? big : step;
                const next = stepFixed(Math.min(max, Math.max(min, clamped + delta * inc)));
                onChange(next);
            }}
            style={{
                width: `${s}px`,
                height: `${s}px`,
            }}
        >
            <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="dial-svg" aria-hidden="true">
                <defs>
                    <linearGradient id="dial-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--dial-accent-start, #4dabf7)" />
                        <stop offset="100%" stopColor="var(--dial-accent-end, #17a2b8)" />
                    </linearGradient>
                    <filter id="soft-shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.25)" />
                    </filter>
                </defs>
                <g transform={`rotate(135 ${center} ${center})`}>
                    {/* 트랙 */}
                    <circle
                        cx={center}
                        cy={center}
                        r={r}
                        fill="none"
                        stroke="var(--dial-track, rgba(0,0,0,0.08))"
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={`${arcLength} ${circumference}`}
                        className="dial-track"
                    />
                    {/* 진행 */}
                    <circle
                        cx={center}
                        cy={center}
                        r={r}
                        fill="none"
                        stroke="url(#dial-grad)"
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={dashArray}
                        className="dial-progress"
                        style={{ filter: 'url(#soft-shadow)' }}
                    />
                </g>
            </svg>
            <div className={`dial-center ${hasFocus ? 'focus' : ''}`}>
                <div className="dial-value">{clamped.toFixed(1)}</div>
            </div>
        </div>
    );
};

export default TemperatureDial;
