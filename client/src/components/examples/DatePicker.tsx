import DatePicker from '../DatePicker';

export default function DatePickerExample() {
  const handleDateSelect = (year: number, month: number, day: number, hour: number, isLunar: boolean) => {
    console.log('Selected date:', { year, month, day, hour, isLunar });
    // todo: remove mock functionality
  };

  return (
    <div className="p-4">
      <DatePicker 
        onDateSelect={handleDateSelect}
        initialDate={{
          year: 1990,
          month: 12,
          day: 25,
          hour: 14,
          isLunar: false
        }}
      />
    </div>
  );
}