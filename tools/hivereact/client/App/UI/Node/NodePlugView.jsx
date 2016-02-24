import React from "react"
import ReactDOM from "react-dom"
import Core from '../../Core'
import Store from './Store.jsx'
import NodePlug from './NodePlug.jsx'

/**
 * ノードの端子間の接続線を全て内包するビュー.
 */
export default class NodePlugView extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			plugPositions : this.props.nodeStore.getPlugPositions()
		};

		this.props.store.on(Core.Store.NODE_CHANGED, (err, data) => {
			let plugs = this.state.plugPositions;

			for (let i = 0, size = plugs.length; i < size; i = i + 1) {
				let plug = plugs[i];
				let inpos = this.props.nodeStore.calcPlugPosition(true, plug, data);
				if (inpos) {
					this.props.nodeAction.changePlugPosition(plug.input.nodeVarname, true, plug.input.name, inpos);
				} else {
					let outpos = this.props.nodeStore.calcPlugPosition(false, plug, data);
					//console.log("outpos", outpos);
					if (outpos) {
						this.props.nodeAction.changePlugPosition(plug.output.nodeVarname, false, plug.output.name, outpos);
					}
				}
			}
		});

		this.props.nodeStore.on(Store.PLUG_POSITION_CHANGED, (err, data) => {
			this.setState({plugPositions : [].concat(data) });
		});
	}

	createPlug(plugPos, key) {
		return (<NodePlug plug={plugPos} key={String(key)} />)
	}

	render() {
		let plugList = (this.state.plugPositions.map( (plugPos, key) => {
			return this.createPlug.bind(this)(plugPos, key);
		} ));
		return (
				<svg width="100%" height="100%" version='1.1' xmlns='http://www.w3.org/2000/svg'>
					{plugList}
				</svg>
		);
	}
}