LoadCDM = {}
setmetatable(LoadCDM, {__index = HiveBaseModule})

LoadCDM.new = function (varname)
    local this = HiveBaseModule.new(varname);
    this.loader = LoadModule('CdmLoader')
    setmetatable(this, {__index=LoadCDM})
    return this
end

function LoadCDM:Do()
    self:UpdateValue()
	if self.value.filepath ~= nil and self.value.filepath ~= "" then
       if self.value.migration then
          return self.loader:LoadMxN(self.value.filepath,
                                     self.value.division[1],
                                     self.value.division[2],
                                     self.value.division[3],
                                     self.value.time)
       else
          return self.loader:LoadMxM(self.value.filepath, self.value.time)
       end
	else
		return false
	end
end

function LoadCDM:VolumeData()
    return self.loader:VolumeData()
end

function LoadCDM:Size()
    local size = {self.loader:Width(), self.loader:Height(), self.loader:Depth()}
    return size
end

function LoadCDM:Component()
    return self.loader:Component()
end

function LoadCDM:GlobalDiv()
    local globalDiv = {self.loader:GlobalDivX(), self.loader:GlobalDivY(), self.loader:GlobalDivZ()}
    return globalDiv
end

function LoadCDM:GlobalVoxel()
    local globalVoxel = {self.loader:GlobalVoxelX(), self.loader:GlobalVoxelY(), self.loader:GlobalVoxelZ()}
    return globalVoxel
end

function LoadCDM:GlobalOffset()
    local globalOffset = {self.loader:GlobalOffsetX(), self.loader:GlobalOffsetY(), self.loader:GlobalOffsetZ()}
    return globalOffset
end

function LoadCDM:GlobalRegion()
    local globalRegion = {self.loader:GlobalRegionX(), self.loader:GlobalRegionY(), self.loader:GlobalRegionZ()}
    return globalRegion
end


function LoadCDM:NumTimeSteps()
    return self.loader:NumTimeSteps()
end
