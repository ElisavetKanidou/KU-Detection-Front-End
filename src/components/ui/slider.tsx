import React from 'react';
import * as SliderPrimitive from "@radix-ui/react-slider";

interface SliderProps {
    min: number;
    max: number;
    step: number;
    value: [number];
    onValueChange: (value: [number]) => void;
    className?: string;
    minDate?: string; // Προσθήκη νέας prop για την ελάχιστη ημερομηνία
    maxDate?: string; // Προσθήκη νέας prop για τη μέγιστη ημερομηνία
}

const Slider = React.forwardRef<HTMLSpanElement, SliderProps>(({
    min,
    max,
    step,
    value,
    onValueChange,
    className,
    minDate,
    maxDate,
}, ref) => {
    return (
        <div className="w-full">
            <SliderPrimitive.Root
                className={`relative flex items-center touch-none select-none ${className}`}
                defaultValue={value}
                max={max}
                min={min}
                step={step}
                onValueChange={onValueChange}
            >
                <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                    <SliderPrimitive.Range className="absolute h-full bg-blue-500" />
                </SliderPrimitive.Track>
                <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full bg-white ring-offset-1 ring-2 focus:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50" ref={ref} />
            </SliderPrimitive.Root>
            {/* Εμφάνιση του εύρους ημερομηνιών */}
            <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>{maxDate ? new Date(maxDate).toLocaleDateString() : "N/A"}</span>
                <span>{minDate ? new Date(minDate).toLocaleDateString() : "N/A"}</span>
            </div>
        </div>
    );
});

Slider.displayName = 'Slider';
export default Slider;