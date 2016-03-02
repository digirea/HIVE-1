import React from "react";
import ReactDOM from "react-dom";
import Core from '../../Core';

export default class Container extends React.Component {
    constructor(props) {
        super(props);

        this.store = props.store;
        this.action = props.action;
        this.state = {
            node: this.props.node,
            closeHover: false
        };
        this.isLeftDown = false;
        this.isScaleLeftDown = false;

        this.nodeChanged = this.nodeChanged.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillUnmount = this.componentWillUnmount.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onScaleMove = this.onScaleMove.bind(this);
        this.onScaleUp = this.onScaleUp.bind(this);
        this.onScaleDown = this.onScaleDown.bind(this);

    }

    nodeChanged(err, data) {
        if(data.varname === this.state.node.varname){
            this.setState({node: data});
        }
    }

    componentDidMount() {
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('mouseup', this.onMouseUp);
        window.addEventListener('mousemove', this.onScaleMove);
        window.addEventListener('mouseup', this.onScaleUp);
        this.store.on(Core.Constants.NODE_CHANGED, this.nodeChanged);
        this.store.on(Core.Constants.NODE_SELECTE_CHANGED, this.nodeChanged);
    }

    componentWillUnmount() {
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mouseup', this.onMouseUp);
        window.removeEventListener('mousemove', this.onScaleMove);
        window.removeEventListener('mouseup', this.onScaleUp);
        this.store.removeListener(Core.Constants.NODE_CHANGED, this.nodeChanged);
        this.store.removeListener(Core.Constants.NODE_SELECTE_CHANGED, this.nodeChanged);
    }

    onMouseDown(ev) {
        if(ev.button === 0){
            this.isLeftDown = true;
            this.mousePos = {x: ev.clientX - this.state.node.panel.pos[0], y: ev.clientY - this.state.node.panel.pos[1]};
            this.offsetLeft = ev.currentTarget.offsetLeft;
            this.offsetTop = ev.currentTarget.offsetTop;
            this.forwardIndex(this.state.node);
        }
    }

    onMouseUp(ev) {
        this.isLeftDown = false;
    }

    onMouseMove(ev) {
        if (this.isLeftDown) {
            let node = this.state.node;
            let mv = {x: ev.clientX - this.mousePos.x, y: ev.clientY - this.mousePos.y};
			let panel = JSON.parse(JSON.stringify(node.panel));
            panel.pos[0] = this.offsetLeft + mv.x;
            panel.pos[1] = this.offsetTop + mv.y;
            this.action.changeNode({
				varname : node.varname,
				panel : panel
			});
        }
		ev.preventDefault();
    }

    onScaleDown(ev) {
        if(ev.button === 0){
            this.isScaleLeftDown = true;
            this.scalePos = {x: ev.clientX, y: ev.clientY};
            this.offsetScaleLeft = Math.max(ev.currentTarget.offsetLeft + ev.currentTarget.offsetWidth, 100);
            this.offsetScaleTop  = Math.max(ev.currentTarget.offsetTop + ev.currentTarget.offsetHeight, 100);
            this.forwardIndex(this.state.node);
        }
    }

    onScaleUp(ev) {
        this.isScaleLeftDown = false;
    }

    onScaleMove(ev) {
        if (this.isScaleLeftDown) {
            let node = this.state.node;
            let mv = {x: ev.clientX - this.scalePos.x, y: ev.clientY - this.scalePos.y};
			let panel = JSON.parse(JSON.stringify(node.panel));
            panel.size[0] = Math.max(this.offsetScaleLeft + mv.x, 100);
            panel.size[1] = Math.max(this.offsetScaleTop + mv.y, 100);
            this.action.changeNode({
				varname : node.varname,
				panel : panel
			});
        }
    }

    // 閉じるボタンが押された.
    onCloseClick(ev) {
        this.action.changePanelVisible(this.state.node.varname, false);
    }

    // 閉じるボタンにマウスホバーされた
    onCloseHover(ev) {
        this.setState({ closeHover : !this.state.closeHover });
    }

    // index を最前面に持ってくる
    // target === ターゲットノード
    forwardIndex(target){
        let nodes = this.store.getNodes();
        let len = nodes.length;
        let targetIndex = target.panel.zindex;
        let varnamelist = [];
        let unvarnamelist = [];
        for(let i in nodes){
            if(nodes[i].varname === target.varname){
                nodes[i].panel.zindex = len;
                nodes[i].select = true;
            }else{
                if(nodes[i].panel.zindex > targetIndex){
                    --nodes[i].panel.zindex;
                }
                nodes[i].select = false;
            }
            this.action.changeNode(nodes[i]);
            if(nodes[i].select){
                varnamelist.push(nodes[i].varname);
            }else{
                unvarnamelist.push(nodes[i].varname);
            }
        }
        this.action.unSelectNode([], varnamelist);
        this.action.selectNode(varnamelist);
    }

    styles() {
        return {
            container : {
                backgroundColor: "#666",
                border: this.state.node.select ? "1px solid orange" : "0px solid orange",
                margin : "0px",
                padding : "0px",
                minWidth : this.state.node.panel.size[0] + "px",
                minHeight: this.state.node.panel.size[1] + "px",
                position: "absolute",
                top:  this.state.node.panel.pos[1] + "px",
                left: this.state.node.panel.pos[0] + "px",
                boxShadow: "0px 0px 3px 0px skyblue inset",
                zIndex: this.state.node.panel.zindex,
                display: this.state.node.panel.visible ? "block" : "none"
            },
            panelTitleBar: {
                backgroundColor: "silver",
                color: "#333",
                fontSize: "8pt",
                lineHeight: "24px",
                minHeight: "24px",
                margin: "0px",
                padding: "0px 5px",
                cursor: "move"
            },
            panelCloseButton: {
                backgroundColor : "#ea4412",
                border: this.state.closeHover ? "solid 1px white" : "none",
                borderRadius : "5px",
                color: "white",
                fontWeight: "bold",
                lineHeight: "15px",
                textAlign : "center",
                margin : "4px",
                width: "15px",
                height: "15px",
                position : "absolute",
                top: "0px",
                right: "0px",
                cursor: "pointer"
            },
            panelScale: {
                backgroundColor: "orange",
                position: "absolute",
                bottom: "0px",
                right: "0px",
                width: "15px",
                height: "15px",
                overflow: "hidden",
                cursor: "se-resize"
            }
        };
    }

    render() {
        // if(!this.state.node.panel.visible){return;}
        var node, res, styles = this.styles();
        node = this.state.node;
        if(!node.uiComponent){
            node.uiComponent = eval(node.uiFunc);
        }
        if (node.uiComponent === undefined) {
            res = "";
        } else {
            res = React.createFactory(this.state.node.uiComponent)({
                store: this.store,
                action: this.action,
                node: node
            });
        }
        return (
            <div style={styles.container}>
                <div style={styles.panelTitleBar} onMouseDown={this.onMouseDown.bind(this)}>
                    {this.state.node.varname}
                    <div
                        style={styles.panelCloseButton}
                        onClick={this.onCloseClick.bind(this)}
                        onMouseEnter={this.onCloseHover.bind(this)}
                        onMouseLeave={this.onCloseHover.bind(this)}
                    >x</div>
                </div>
                <div>{res}</div>
                <div style={styles.panelScale} onMouseDown={this.onScaleDown.bind(this)}>
                </div>
            </div>
        );
    }
}
