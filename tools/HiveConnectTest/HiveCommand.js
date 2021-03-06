/*jslint devel:true*/

(function (window) {
	'use strict';
	var HiveCommand = {
		createCamera : function (name) {
			return 'hcmd.CreateCamera("' + name + '")';
		},
		clearObjects : function () {
			return 'hcmd.ClearObjects()';
		},
		loadOBJ : function (name, filename, shader, useReturn) {
			var src = useReturn ? 'return ' : '';
			src += 'hcmd.LoadOBJ("' + name + '","' + filename + '","' + shader + '")';
			return src;
		},
		loadSTL : function (name, filename, shader, useReturn) {
			var src = useReturn ? 'return ' : '';
			src += 'hcmd.LoadSTL("' + name + '","' + filename + '","' + shader + '")';
			return src;
		},
		loadPDB : function (name, filename, shader, useReturn) {
			var src = useReturn ? 'return ' : '';
			src += 'hcmd.LoadPDB("' + name + '","' + filename + '","' + shader + '")';
			return src;
		},
		loadSPH : function (name, filename, shader, useReturn) {
			var src = useReturn ? 'return ' : '';
			src += 'hcmd.LoadSPH("' + name + '","' + filename + '","' + shader + '")';
			return src;
		},
		renderCamera : function (w, h, cameraname, useReturn) {
			var src = useReturn ? 'return ' : '';
			src += 'hcmd.RenderCamera(' + w + ',' + h + ',"' + cameraname + '", "raw", true)';
			return src;
		},
		newScene : function () {
			return 'hcmd.NewScene()';
		},
		deleteObject : function (name) {
			return 'hcmd.DeleteObject("' + name + '")';
		},
		updateSceneInformation : function () {
			return 'hcmd.UpdateSceneInformation()';
		},
		cameraScreenSize : function (name, width, height) {
			return 'hcmd.CameraScreenSize("' + name + '",' + width + ',' + height + ')';
		},
		cameraClearColor : function (name, red, green, blue, alpha) {
			return 'hcmd.CameraClearColor("' + name + '",' + red + ',' + green  + ',' + blue + ',' + alpha + ')';
		},
		cameraFilename : function (name, filename) {
			return 'hcmd.CameraOutputFilename("' + name + '","' + filename + '")';
		},
		cameraPos : function (name, camerapos) {
			console.log('Duplicated method.');
			return 'hcmd.CameraPos("' + name + '",' + camerapos[0] + ',' + camerapos[1] + ',' + camerapos[2] + ')';
		},
		cameraLookat : function (name, camera_pos, camera_tar, camera_up, camera_fov) {
			var src = 'hcmd.CameraLookat("';
			src += name + '",';
			src += camera_pos[0] + ',' + camera_pos[1] + ',' + camera_pos[2] + ',';
			src += camera_tar[0] + ',' + camera_tar[1] + ',' + camera_tar[2] + ',';
			src += camera_up[0]  + ',' + camera_up[1]  + ',' + camera_up[2]  + ',';
			src += camera_fov;
			src += ')';
			return src;
		},
		getVolumeAnalyzerData : function (objname, min, max) {
			var src = 'return hcmd.GetVolumeAnalyzerData(';
			src += '"' + objname + '",';
			src += min + ',';
			src += max;
			src += ')\n';
			return src;
		},
		setModelShader : function (objname, shaderpath) {
			var src = 'hcmd.SetModelShader(';
			src += '"' + objname + '",';
			src += '"' + shaderpath + '"';
			src += ')\n';
			src += 'clearCache()\n';
			return src;
		},
		setModelTranslation : function (objname, trans, rot, scale) {
			var src = 'hcmd.SetModelTranslation(';
			src += '"' + objname + '",';
			src += trans[0] + ',';
			src += trans[1] + ',';
			src += trans[2] + ',';
			src += rot[0] + ',';
			src += rot[1] + ',';
			src += rot[2] + ',';
			src += scale[0] + ',';
			src += scale[1] + ',';
			src += scale[2];
			src += ')';
			return src;
		},
		setModelUniformVec4 : function (objname, name, val) {
			console.log(objname, name, val);
			var src = 'hcmd.SetModelUniformVec4(';
			src += '"' + objname + '",';
			src += '"' + name + '",';
			src += val[0] + ',';
			src += val[1] + ',';
			src += val[2] + ',';
			src += val[3];
			src += ')\n';
			return src;
		},
		setModelUniformVec3 : function (objname, name, val) {
			var src = 'hcmd.SetModelUniformVec3(';
			src += '"' + objname + '",';
			src += '"' + name + '",';
			src += val[0] + ',';
			src += val[1] + ',';
			src += val[2];
			src += ')\n';
			return src;
		},
		setModelUniformVec2 : function (objname, name, val) {
			var src = 'hcmd.SetModelUniformVec2(';
			src += '"' + objname + '",';
			src += '"' + name + '",';
			src += val[0] + ',';
			src += val[1];
			src += ')\n';
			return src;
		},
		setModelUniformFloat : function (objname, name, val) {
			console.log('setModelUniformFloat', objname, name, val);
			var src = 'hcmd.SetModelUniformFloat(';
			src += '"' + objname + '",';
			src += '"' + name + '",';
			src += val;
			src += ')\n';
			return src;
		},
		setModelUniformTex : function (objname, name, width, height, rgbaVal) {
			console.log('setModelUniformTex', objname, name, width, height, rgbaVal);
			var src = 'hcmd.SetModelUniformTex(',
				i;
			src += '"' + objname + '",';
			src += '"' + name + '",';
			src += width + ',';
			src += height + ',';
			src += '{';
			for (i = 0; i < height * width * 4; i = i + 1) {
				src += rgbaVal[i] + ',';
			}
			src += '}';
			src += ')\n';
			return src;
		},
		storeObjectTimeline : function (objecttimeline) {
			var tljson = JSON.stringify(objecttimeline),
				src;
			console.log('storeObjectTimeline:' + tljson);
			src = "hcmd.StoreObjectTimeline('" + tljson + "')\n";
			return src;
		}
	};
	window.HiveCommand = HiveCommand;
}(window));