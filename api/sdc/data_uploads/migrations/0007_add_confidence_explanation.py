# Generated manually for confidence_explanation field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('data_uploads', '0006_remove_fitmentwheelparameter_fitment_delete_fitment_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='aifitmentresult',
            name='confidence_explanation',
            field=models.TextField(blank=True, null=True),
        ),
    ]
