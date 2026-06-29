import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface DateTimePickerProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  label,
  value,
  onChange,
}) => {
  return (
    <div className="flex flex-col ">
      <label className="text-base mb-2 font-medium ">{label}</label>
 
      <DatePicker
        selected={value}
        onChange={(date: Date | null) => onChange(date)}
        showTimeSelect
        timeFormat="hh:mm aa" // 12-hour format
        dateFormat="MMMM d, yyyy h:mm aa"
        timeIntervals={5}
        className="border rounded px-3 h-11 w-full"
      />
    </div>
  );
};

export default DateTimePicker;
