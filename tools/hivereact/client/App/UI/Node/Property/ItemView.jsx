import React from "react";
import ReactDOM from "react-dom";
import Core from '../../../Core';
import ItemTitle from './ItemTitle.jsx';
import ItemText from './ItemText.jsx';
import ItemVec from './ItemVec.jsx';
import ItemCheckbox from './ItemCheckbox.jsx';
import ItemArray from './ItemArray.jsx';
import ItemTextInput from './ItemTextInput.jsx';
import ItemSuggest from './ItemSuggest.jsx';

/**
 * ノードプロパティ1ノード分.
 */
export default class ItemView extends React.Component {
	constructor(props) {
		super(props);

		this.label = this.label.bind(this);

		if (this.props.initialNodeData.panel.hasOwnProperty('visible')) {
			this.state = {
				name : this.props.initialNodeData.name,
				label : this.label(),
				isShowPanel : this.props.initialNodeData.panel.visible
			};
		} else {
			this.state = {
				name : this.props.initialNodeData.name,
				label : this.label(),
				isShowPanel : null
			};
		}
        this.topRowUsed = false;
		this.inputChanged = this.inputChanged.bind(this);
		this.panelVisibleChanged = this.panelVisibleChanged.bind(this);
		this.updateHandle = null;
	}

	label() {
		return this.props.initialNodeData.label ? this.props.initialNodeData.label : this.props.initialNodeData.name;
	}

	styles() {
		return {
			view : {
				width : "255px",
				// backgroundColor : "rgb(80, 80, 80)",
				// color : "black",
				display : "table"
			},
            propertyContainer: {
                backgroundColor: "rgb(133,133,133)",
                borderRadius: "2px",
                margin: "2px",
                width: "255x"
            }
		};
	}

	inputChanged(err, data) {
		if (data.varname === this.props.initialNodeData.varname) {
		console.log(data);
			for (let i = 0; i < data.input.length; i = i + 1) {
				let hole = data.input[i];
				let id = hole.nodeVarname + "_" + hole.name;
				if (this.refs.hasOwnProperty(id)) {
					if (hole.hasOwnProperty('meta') && hole.meta === 'shaderlist') {
						this.refs[id].setState({
							value : hole.value
						});
					} else if (hole.type === 'vec2' || hole.type === 'vec3' || hole.type === 'vec4') {
						this.refs[id].setState({
							values : hole.value
						});
					} else if (hole.type === 'string' || hole.type === 'float') {
						this.refs[id].setState({
							value : hole.value
						});
					} else if (hole.type === 'bool') {
						this.refs[id].setState({
							checked : hole.value
						});
					}
				}
			}
		}
	}

	panelVisibleChanged(err, data) {
		if (data.varname === this.props.initialNodeData.varname) {
			if (this.state.isShowPanel !== data.panel.visible) {
				this.setState( {
					isShowPanel : data.panel.visible
				});
			}
		}
	}

	componentDidMount() {
		this.props.store.on(Core.Constants.NODE_INPUT_CHANGED, this.inputChanged);
		this.props.store.on(Core.Constants.PANEL_VISIBLE_CHANGED, this.panelVisibleChanged);
	}

	componentWillUnmount() {
		this.props.store.removeListener(Core.Constants.NODE_INPUT_CHANGED, this.inputChanged);
		this.props.store.removeListener(Core.Constants.PANEL_VISIBLE_CHANGED, this.panelVisibleChanged);
	}

	changeFunc(name, value) {
		let input = {};
		input[name] = JSON.parse(JSON.stringify(value));
		this.props.action.changeNodeInput({
			varname : this.props.initialNodeData.varname,
			input : input
		});
	}

	changeLabelFunc(name, value) {
		if (name === "label") {
			this.props.action.changeNode({
				varname : this.props.initialNodeData.varname,
				label : value
			});
			this.refs.nameInput.setState({
				value : this.label()
			})
		}
	}

	changeVecFunc(name, index, value) {
		let node = this.props.store.getNode(this.props.initialNodeData.varname).node;
		let inputs = node.input;
		for (let i = 0; i < inputs.length; i = i + 1) {
			if (inputs[i].name === name) {
				let copyVal = JSON.parse(JSON.stringify(inputs[i].value));
				copyVal[index] = value;
				let input = {};
				input[name] = copyVal;
				this.props.action.changeNodeInput({
					varname : this.props.initialNodeData.varname,
					input : input
				});
				break;
			}
		}
		//this.props.action.changeNodeInput(this.props.initialNodeData.varname, name, value, index);
	}

	changeLengthFunc(name, length) {
		let node = this.props.store.getNode(this.props.initialNodeData.varname).node;
		let inputs = JSON.parse(JSON.stringify(node.input));
		for (let i = 0; i < inputs.length; i = i + 1) {
			if (inputs[i].name === name) {
				for (let k = inputs[i].array.length; k < length; k = k + 1) {
					inputs[i].array.push(
						{"name": name + "[" + String(k) + "]",  "type": inputs[i].type }
					);
				}
				inputs[i].array.length = length;
				this.props.action.changeNode({
					varname : this.props.initialNodeData.varname,
					input : inputs
				});
			}
		}
	}

	changeCheckboxFunc(itemName, value) {
		if (itemName === "show panel") {
			let node = this.props.store.getNode(this.props.initialNodeData.varname).node;
			node.panel.visible = value;
			this.props.action.changePanelVisible(
				this.props.initialNodeData.varname,
				value
			);
		}
	}

	changeKeyFunc(hole) {
		let node = this.props.store.getNode(this.props.initialNodeData.varname).node;
		if (node) {
			this.props.action.addKeyFrame(
				this.props.store.getCurrentFrame(),
				node,
				hole
			);
		}
	}

	panelCheckbox() {
		if (this.state.isShowPanel !== null) {
            this.topRowUsed = true;
			return (<ItemCheckbox
				initialParam={{
					name : "show panel",
					value : this.state.isShowPanel
				}}
                top={this.topRowUsed}
				changeCheckboxFunc={this.changeCheckboxFunc.bind(this)}
				key={String(this.props.id + "_panel")}
				id={String(this.props.id + "_panel")} />);
		}
	}

	onExportGroup(ev) {
		this.props.action.exportGroupNode(this.props.initialNodeData.varname);
	}

	contents() {
		const styles = this.styles.bind(this)();
        this.topRowUsed = false;

		let labelParam = {
			nodeVarname : this.props.initialNodeData.varname,
			name : "label",
			value : this.state.label
		};
		let labelProp = (<ItemTextInput ref="nameInput"
					varname={this.props.initialNodeData.varname}
					store={this.props.store}
					initialParam={labelParam} key={-100} id={-100} changeFunc={this.changeLabelFunc.bind(this)}/>);

		let exportButton = "";
		if (this.props.store.isGroup(this.props.initialNodeData)) {
			exportButton = (<div
				style={{
					border : "solid 1px",
					borderRadius : "3px",
					backgroundColor : "rgb(54, 196, 168)",
					color : "black",
					width : "60px",
					height : "22px",
					textAlign : "center",
					margin : "1px",
					float : "right",
					cursor : "pointer"
				}}
				onClick={this.onExportGroup.bind(this)}>Export</div>);
		}

		let inputs = this.props.initialNodeData.input.map( (hole, key) => {
            let id = hole.nodeVarname + "_" + hole.name;
			console.log(id)
            let topRow = this.state.isShowPanel === null && !this.topRowUsed && parseInt(key, 10) === 0;
            let bottom = this.props.initialNodeData.input.length - 1 === parseInt(key, 10);
			if (Array.isArray(hole.array)) {
				return (<ItemArray  ref={id}
							varname={this.props.initialNodeData.varname}
							store={this.props.store}
							changeLengthFunc={this.changeLengthFunc.bind(this)}
                            initialParam={hole} key={id}
                            top={topRow}
                            bottom={bottom} />);
			} else if (hole.meta === 'shaderlist') {
				return (<ItemSuggest  ref={id}
							varname={this.props.initialNodeData.varname}
							store={this.props.store}
							initialParam={hole} key={id} changeFunc={this.changeFunc.bind(this)}
                            top={topRow}
                            bottom={bottom} />);
			} else if (hole.type === 'vec2' || hole.type === 'vec3' || hole.type === 'vec4') {
				return (<ItemVec  ref={id}
							varname={this.props.initialNodeData.varname}
							store={this.props.store}
							initialParam={hole} key={id}  changeVecFunc={this.changeVecFunc.bind(this)}
                            top={topRow}
							changeKeyFunc={this.changeKeyFunc.bind(this)}
                            bottom={bottom} />);
			} else if (hole.type === 'string' || hole.type === 'float') {
				return (<ItemTextInput  ref={id}
							varname={this.props.initialNodeData.varname}
							store={this.props.store}
							initialParam={hole} key={id} changeFunc={this.changeFunc.bind(this)}
                            top={topRow}
							changeKeyFunc={this.changeKeyFunc.bind(this)}
                            bottom={bottom} />);
            } else if (hole.type === 'bool') {
			    return (<ItemCheckbox ref={id}
				            varname={this.props.initialNodeData.varname}
							store={this.props.store}
                            initialParam={hole}
                            key={id}
                            top={topRow}
                            bottom={bottom}
							changeKeyFunc={this.changeKeyFunc.bind(this)}
				            changeCheckboxFunc={this.changeFunc.bind(this)} />);
			} else {
				return (<ItemText store={this.props.store} initialParam={hole} key={id} top={topRow} bottom={bottom}/>);
			}
		});
		return (
			<div>
				<ItemTitle
					initialParam={{
						name : "Node",
						value : this.state.name
					}}
					exportButton={exportButton}
					key={String(this.props.id + "_title")}
					id={String(this.props.id + "_title")}>
				</ItemTitle>
                <div style={styles.propertyContainer}>
                    {this.panelCheckbox.bind(this)()}
					{labelProp}
                    {inputs}
                </div>
			</div>
		);
	}

	render () {
		const styles = this.styles.bind(this)();
		return (<div style={styles.view}>
			{this.contents.bind(this)()}
		</div>);
	}
}
