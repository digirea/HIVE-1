ChOWDER = {}
setmetatable(ChOWDER, {__index = HiveBaseModule})

ChOWDER.new = function (varname)
    local this = HiveBaseModule.new(varname)
    setmetatable(this, {__index=ChOWDER})
    this.id = "id_" .. string.byte(math.random(100000000))
    this.url = ""
    return this
end

function ChOWDER:Do()
    -- nothing to do
    self:UpdateValue()
    local v = self.value
    local image = v.image
    if (image == nil) then
        print "image nil"
        return "Image is not connected."
    end
    local width = v.screensize[1] 
    local height = v.screensize[2] 
    
    local saver = ImageSaver()
    local imageBuffer = saver:SaveMemory(1, image)
    local imageBufferSize = saver:MemorySize()

    -- create metabinary
    local metabin = LoadModule("Network").MetaBinary()
    local json; 
    if self.preWidth ~= width or self.preHeight ~= height then
        json = [[{
                "jsonrpc" : "2.0",
                "method" : "AddContent",
                "to" : "master",
                "params" : {
                    "id" : "]] .. self.id .. [[",
                    "content_id" : "]] .. self.id .. [[",
                    "type" : "image",
                    "orgWidth" : "]] .. width .. [[",
                    "orgHeight" : "]] .. height .. [[",
                    "width" : "]] .. width .. [[",
                    "height" : "]] .. height .. [["
                }
        }]]
    else
        json = [[{
                "jsonrpc" : "2.0",
                "method" : "AddContent",
                "to" : "master",
                "params" : {
                    "id" : "]] .. self.id .. [[",
                    "content_id" : "]] .. self.id .. [[",
                    "type" : "image",
                    "orgWidth" : "]] .. width .. [[",
                    "orgHeight" : "]] .. height .. [["
                }
        }]]
    end
    self.preWidth = width
    self.preHeight = height
    
    print(json)
    metabin:Create(json, imageBuffer, imageBufferSize) 

    print('chowder node URL:', v.url);

    if self.url ~= v.url then
        if self.ws then
            self.ws:Close()
        end
        self.ws = nil
    end

    -- send through websocket
    if (self.ws == nil) then
        self.ws = LoadModule("Network").Connection()
        local nr = self.ws:Connect(v.url) --'ws://localhost:8081/v2/')
        self.url = v.url
        if not nr then
            print('Chowder Connect faild:', v.url);
            return "Faild to connect ChOWDER"
        else
            print('Chowder Connected:', v.url);
        end
    end
    self.ws:SendBinary(metabin:BinaryBuffer(), metabin:BinaryBufferSize())
    --ws:Close()
    
    return true
end
