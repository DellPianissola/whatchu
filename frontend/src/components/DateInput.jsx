import FormField from './FormField.jsx'
import { todayISODate } from '../utils/content'

const DateInput = ({ max = todayISODate(), ...rest }) => (
  <FormField type="date" max={max} {...rest} />
)

export default DateInput
