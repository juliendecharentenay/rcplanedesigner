import { atmosphere } from './atmosphere'

export class WingAnalyser {
  constructor(props) {
    this.airfoil = props.airfoil
    this.wingSpan = props.wingSpan
    this.rootChord = props.rootChord
    this.tipChord = props.tipChord
    this.sweepAngle = props.sweepAngle
  }

  get taperRatio() { return null }
  get wingArea() { return null }
  get aspectRatio() { return null }
  get rootReynolds() { return null }
  get tipReynolds() { return null }
}
