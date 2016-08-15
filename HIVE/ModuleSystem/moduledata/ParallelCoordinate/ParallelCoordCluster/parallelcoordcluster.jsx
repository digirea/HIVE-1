import React from 'react';
import ReactDOM from "react-dom";

class ParallelContainer extends React.Component {
    constructor(props){
        super(props);

        // member
        this.store  = this.props.store;
        this.action = this.props.action;
        this.node   = this.props.node;

        // variables
        this.parallel = null;

        // const
        this.PANEL_SIZE_CHANGED = "panel_size_changed";
        this.ANALYZED_DATA_RECIEVED = "analyzed_data_recieved";
        this.NODE_INPUT_CHANGED = "node_input_changed";
        this.STORE_IMAGE_RECIEVED = "image_revieved";

        // function
        this.init = this.init.bind(this);
        this.getInputValue = this.getInputValue.bind(this);
        this.nodeInputChanged = this.nodeInputChanged.bind(this);
        this.onPanelSizeChanged = this.onPanelSizeChanged.bind(this);
        this.imageRecieved = this.imageRecieved.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillUnmount = this.componentWillUnmount.bind(this);

        // let source = this.getInputValue('clusterdata');
        let source = this.props.node.input[1].value;
        if(!source || source === '{}' || !source.match(/^(\[|\{)/)){
            source = null;
        }else{
            source = JSON.parse(source);
        }
        this.state = {
            clusterdata: source,
            width: 600,
            height: 300
        };
    }

    // global initialize
    init(json){
        var i, j;

        // data check
        if(!json || !json.hasOwnProperty('axis') || json.axis.length < 2){
            console.log('invalid data');
            console.log(json);
            return;
        }

        // this.parallel initialize
        if(!this.parallel){
            this.parallel = new ParallelCoordCluster(ReactDOM.findDOMNode(this.refs.container));
        }

        // add or reset axis
        this.parallel.resetAxis(json);
    }

    getInputValue(key){
        for(let i = 0; i < this.node.input.length; ++i){
            if(this.node.input[i].name === key){
                return this.node.input[i].value;
            }
        }
    }

    imageRecieved(err, param, data){
        debugger;
        var arr, parse, minmax, label, labelkey;
        const varname = this.node.varname;
        if(param.varname !== varname || param.mode === undefined || param.mode !== 'raw'){return;}
    }

    nodeInputChanged(){
        let source = this.props.node.input[1].value;
        if(!source || source === '{}' || !source.match(/^(\[|\{)/)){
            console.log('but invalid', source);
            return;
        }
        let json = JSON.parse(source);
        this.setState({clusterdata: json});
        this.init(json);
    }

    componentDidMount(){
        // panel change
        this.store.on(this.PANEL_SIZE_CHANGED, this.onPanelSizeChanged);
        this.store.on(this.ANALYZED_DATA_RECIEVED, this.imageRecieved);
        this.store.on(this.NODE_INPUT_CHANGED, this.nodeInputChanged);
        this.store.on(this.STORE_IMAGE_RECIEVED, this.imageRecieved);

        this.init(this.state.clusterdata);
    }

    componentWillUnmount(){
        this.store.off(this.PANEL_SIZE_CHANGED, this.onPanelSizeChanged);
        this.store.off(this.ANALYZED_DATA_RECIEVED, this.imageRecieved);
        this.store.off(this.NODE_INPUT_CHANGED, this.nodeInputChanged);
        this.store.off(this.STORE_IMAGE_RECIEVED, this.imageRecieved);
    }

    onPanelSizeChanged(err, data){
        this.setState({
            width: data.panel.size[0],
            height: data.panel.size[1],
        });
        if(!this.parallel.glReady){return;}
        this.parallel.setRect(data.panel.size[0], data.panel.size[1]);
        this.parallel.resetAxis();
    }

    styles(){
        return {
            container: {
                width: this.state.width + "px",
                height: this.state.height + "px"
            },
            canvas: {
                width: "100%",
                height: "100%",
                backgroundColor: "rgba(0, 0, 255, 0.1)"
            }
        };
    }

    render(){
        const styles = this.styles();
        return (
            <div>
                <div ref="container" style={styles.container}>
                </div>
            </div>
        );
    }

}

module.exports = ParallelContainer;

