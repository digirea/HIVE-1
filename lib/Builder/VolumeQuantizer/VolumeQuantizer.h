/**
 * @file VolumeQuantizer.h
 * VolumeData 量子化リダクションされたVolumeDataを作成するモジュール
 */
#ifndef _VOLUMEQUANTIZER_H_
#define _VOLUMEQUANTIZER_H_

#include "Ref.h"
#include "Buffer.h"
#include <vector>
#include "BufferVolumeData.h"

class VolumeQuantizer : public RefCount
{
private:
    RefPtr<BufferVolumeData> m_volume;
    std::vector<RefPtr< BufferVolumeData> > m_inputs;
    
    std::vector<std::pair<float, float> > m_minmax;
    int m_quantizeSize;
    int m_sampling[3];
    
public:
    VolumeQuantizer();
    int Create();
    bool Clear();
    bool Add(BufferVolumeData *volume);

    BufferVolumeData*  VolumeData();

    bool QuantizeSize(int qsize);
    bool SamplingNum(int widthDiv, int heightDiv, int depthDiv);

    const std::vector<std::pair<float, float> >& GetMinMax();
};

#endif //_VOLUMEQUANTIZER_H_

