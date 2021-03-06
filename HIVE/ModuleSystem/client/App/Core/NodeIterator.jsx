

export class NodeIterator {
	constructor() {
	}
}

/**
 * あるノードの入力ノードを列挙するイテレータ.
 * arrayがあった場合は、arrayの中身を辿る.
 */
NodeIterator.makeInputIterator = (store, node) => {
	return {
		[Symbol.iterator]() {
			let currentNode = node;
			let inputIndex = 0;
			let arrayIndex = 0;
			return {
				next() {
					let input = null;
					if (inputIndex < currentNode.input.length) {
						input = currentNode.input[inputIndex];
						while (true) {
							if (Array.isArray(input.array)) {
								if (arrayIndex < input.array.length) {
									input = input.array[arrayIndex];
									++arrayIndex;
								} else {
									++inputIndex;
									arrayIndex = 0;
									if (inputIndex < currentNode.input.length) {
										input = currentNode.input[inputIndex];
										continue;
									} else {
										return {
											value : {
												input : null
											},
											done : true
										};
									}
									//arrayIndex = 0;
								}
							} else {
								++inputIndex;
								arrayIndex = 0;
							}

							return {
								value : {
									input : input
								},
								done : false
							};
						}
					} else {
						return {
							value : {
								input : null
							},
							done : true
						};
					}
				}
			};
		}
	}
};

/**
 * あるノードの出力ノードを列挙するイテレータ.
 */
NodeIterator.makeOutputIterator = (store, node) => {
	return {
		[Symbol.iterator]() {
			let currentNode = node;
			let outputIndex = 0;
			let arrayIndex = 0;
			return {
				next() {
					let output = null;
					if (outputIndex < currentNode.output.length) {
						output = currentNode.output[outputIndex];
						while (true) {
							if (Array.isArray(output.array)) {
								if (arrayIndex < output.array.length) {
									output = output.array[arrayIndex];
									++arrayIndex;
								} else {
									++outputIndex;
									arrayIndex = 0;
									if (outputIndex < currentNode.output.length) {
										output = currentNode.output[outputIndex];
										continue;
									} else {
										return {
											value : {
												output : null
											},
											done : true
										};
									}
									//arrayIndex = 0;
								}
							} else {
								++outputIndex;
								arrayIndex = 0;
							}

							return {
								value : {
									output : output
								},
								done : false
							};
						}
					} else {
						return {
							value : {
								output : null
							},
							done : true
						};
					}
				}
			};
		}
	}
};

/**
 * あるノードの出力ノードを列挙するイテレータ.
 */
NodeIterator.makeInputOutputIterator = (store, node) => {
	return {
		[Symbol.iterator]() {
			let inputIterator = NodeIterator.makeInputIterator(store, node)[Symbol.iterator]();
			let outputIterator = NodeIterator.makeOutputIterator(store, node)[Symbol.iterator]();
			return {
				next() {
					let input = inputIterator.next();
					let output = input.done ? outputIterator.next() : null;
					return {
						value : {
							input : input.value.input,
							output : output ? output.value.output : null
						},
						done : input.done && output && output.done
					};
				}
			};
		}
	}
};

export default new NodeIterator();
