const DateTimePicker = () => null;
export default DateTimePicker;

export type DateTimePickerEvent = {
  type: 'set' | 'dismissed' | 'neutralButtonPressed';
  nativeEvent: {
    timestamp: number;
    utcOffset?: number;
  };
};
